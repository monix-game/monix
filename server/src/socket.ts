import { WebSocketServer } from 'ws';
import type { Server } from 'node:http';
import type { Server as HttpsServer } from 'node:https';
import { v4 } from 'uuid';
import {
  getSessionByToken,
  getUserByUUID,
  getRoomByUUID,
  getMessageByUUID,
  deleteMessageByUUID,
  updateMessage,
  createReport,
  updateUser,
} from './db';
import {
  buildFishLeaderboardCached,
  buildMoneyLeaderboardCached,
  buildNewsFeed,
  buildPets,
  buildResourceHistory,
  buildResourcePrices,
  buildRooms,
  buildRoomMessages,
  buildSettings,
  buildUserSnapshot,
} from './helpers/snapshots';
import { sendChatMessage } from './helpers/chat';
import { notifyNewChatMessage } from './helpers/push';
import { addUserConnection, removeUserConnection } from './helpers/presence';
import { applyActivityTracking } from './middleware';
import type { IUser } from '../common/models/user';
import type { IMessage } from '../common/models/message';
import { createLogger } from './logging';
import { profanityFilter } from './constants';
import { hasRole } from '../common/roles';
import { isUserBanned } from '../common/punishx/punishx';
import { getCategoryById } from '../common/punishx/categories';
import type { IReport } from '../common/models/report';

const log = createLogger('ws');

// ---------------------------------------------------------------------------
// Channel registry
// ---------------------------------------------------------------------------

type WSSocket = {
  send(data: string): unknown;
  data: object;
};

type SocketAuthData = {
  socketUser?: IUser;
  socketAuthed?: boolean;
  remoteIp?: string;
};

function getAuthData(ws: { data: object }): SocketAuthData {
  return ws.data;
}

const subscribers = new Map<string, Set<WSSocket>>();

function addSubscriber(channel: string, ws: WSSocket) {
  let set = subscribers.get(channel);
  if (!set) {
    set = new Set();
    subscribers.set(channel, set);
  }
  set.add(ws);
}

function removeSubscriber(channel: string, ws: WSSocket) {
  const set = subscribers.get(channel);
  if (set) {
    set.delete(ws);
    if (set.size === 0) subscribers.delete(channel);
  }
}

function isChannelActive(channel: string): boolean {
  return (subscribers.get(channel)?.size ?? 0) > 0;
}

/** Serialize a payload to JSON and send to every subscriber of a channel. */
function sendToChannel(channel: string, payload: unknown) {
  const set = subscribers.get(channel);
  if (!set || set.size === 0) return;
  const msg = JSON.stringify(payload);
  for (const ws of set) {
    try {
      ws.send(msg);
    } catch {
      // Ignore disconnected sockets; cleaned up on close.
    }
  }
}

/** Broadcast a typed snapshot to a channel. Used by routes to push changes. */
export function broadcast(channel: string, data: unknown) {
  sendToChannel(channel, { type: 'snapshot', channel, data });
}

// ---------------------------------------------------------------------------
// Snapshot builders (shared with HTTP routes via helpers/snapshots)
// ---------------------------------------------------------------------------

async function chatSnapshot(roomUuid: string) {
  const result = await buildRoomMessages(roomUuid);
  return 'messages' in result ? result.messages : null;
}

// Chat channels whose messages changed since the last publisher tick. The
// channel publisher only rebuilds these instead of recomputing the full room
// history every second for every active chat channel.
const dirtyChatChannels = new Set<string>();

/**
 * Signals that a room's messages changed (e.g. via an HTTP route or bot that
 * doesn't go through the WebSocket send handler). The chat publisher picks this
 * up and re-broadcasts the room snapshot to subscribers.
 */
export function markChatChannelDirty(roomUuid: string) {
  dirtyChatChannels.add(roomUuid);
}

/**
 * Emit a lightweight "new chat message" event to online clients on the global
 * `chat:new-message` channel. Online clients use this to show the unread dot
 * on the Social tab and in-app toasts without polling every room.
 */
export function broadcastNewChatMessage(roomName: string, message: IMessage) {
  broadcast('chat:new-message', {
    room_uuid: message.room_uuid,
    room_name: roomName,
    sender_uuid: message.sender_uuid,
    sender_username: message.sender_username,
    sender_avatar_url: message.sender_avatar_url,
    content: message.content,
    time_sent: message.time_sent,
  });
}

// ---------------------------------------------------------------------------
// Server-side publishers (replace client-side polling)
// ---------------------------------------------------------------------------

function startChatPublisher() {
  return setInterval(() => {
    if (dirtyChatChannels.size === 0) return;
    const dirty = Array.from(dirtyChatChannels);
    dirtyChatChannels.clear();
    for (const roomUuid of dirty) {
      if (!isChannelActive(`chat:${roomUuid}`)) continue;
      void (async () => {
        try {
          const messages = await chatSnapshot(roomUuid);
          if (messages) broadcast(`chat:${roomUuid}`, messages);
        } catch {
          // Swallow per-channel errors.
        }
      })();
    }
  }, 750);
}

function startLeaderboardPublisher() {
  return setInterval(() => {
    void (async () => {
      try {
        if (isChannelActive('leaderboard:money')) {
          broadcast('leaderboard:money', await buildMoneyLeaderboardCached());
        }
        if (isChannelActive('leaderboard:fish')) {
          broadcast('leaderboard:fish', await buildFishLeaderboardCached());
        }
      } catch {
        // Swallow errors.
      }
    })();
  }, 10000);
}

function startPetsPublisher() {
  return setInterval(() => {
    for (const channel of subscribers.keys()) {
      if (!channel.startsWith('pets:')) continue;
      const userUuid = channel.slice('pets:'.length);
      void (async () => {
        try {
          broadcast(channel, await buildPets(userUuid));
        } catch {
          // Swallow per-channel errors.
        }
      })();
    }
  }, 5000);
}

function startResourcesPublisher() {
  return setInterval(() => {
    for (const channel of subscribers.keys()) {
      if (!channel.startsWith('resources:') || channel === 'resources:prices') continue;
      const resourceId = channel.slice('resources:'.length);
      broadcast(channel, buildResourceHistory(resourceId, 1));
    }
  }, 5000);
}

function startPricesPublisher() {
  return setInterval(() => {
    if (isChannelActive('resources:prices')) {
      broadcast('resources:prices', buildResourcePrices());
    }
  }, 5000);
}

function startNewsPublisher() {
  return setInterval(() => {
    if (isChannelActive('market:news')) {
      broadcast('market:news', buildNewsFeed());
    }
  }, 5000);
}

function startUserPublisher() {
  return setInterval(() => {
    const set = subscribers.get('user:me');
    if (!set || set.size === 0) return;

    // Same user may be connected from multiple tabs/devices. Compute and
    // serialize the snapshot once per user, then share the serialized message
    // across all of that user's connections instead of re-reading the DB and
    // re-serializing per connection.
    const socketsByUser = new Map<string, WSSocket[]>();
    for (const ws of set) {
      const socketUser = getAuthData(ws).socketUser;
      if (!socketUser) continue;
      const bucket = socketsByUser.get(socketUser.uuid);
      if (bucket) bucket.push(ws);
      else socketsByUser.set(socketUser.uuid, [ws]);
    }

    for (const sockets of socketsByUser.values()) {
      const socketUser = getAuthData(sockets[0]).socketUser;
      if (!socketUser) continue;
      void (async () => {
        try {
          const snapshot = await buildUserSnapshot(socketUser);
          if (!snapshot) return;
          const msg = JSON.stringify({ type: 'snapshot', channel: 'user:me', data: snapshot });
          for (const ws of sockets) {
            try {
              ws.send(msg);
            } catch {
              // Ignore disconnected sockets; cleaned up on close.
            }
          }
        } catch {
          // Swallow per-subscriber errors.
        }
      })();
    }
  }, 2000);
}

function startRoomsPublisher() {
  return setInterval(() => {
    const set = subscribers.get('socialRooms');
    if (!set || set.size === 0) return;

    // Regular users see only public rooms -> identical snapshot for all of
    // them, so compute & serialize once and share across every user-role
    // connection instead of once per connection. Staff can see staff/private
    // rooms that vary by membership, so those are still computed per connection.
    const staffSockets: WSSocket[] = [];
    const userSockets: WSSocket[] = [];
    for (const ws of set) {
      const role = getAuthData(ws).socketUser?.role ?? 'user';
      if (role === 'user') userSockets.push(ws);
      else staffSockets.push(ws);
    }

    const push = (wsList: WSSocket[]) => (snapshot: unknown) => {
      const msg = JSON.stringify({ type: 'snapshot', channel: 'socialRooms', data: snapshot });
      for (const ws of wsList) {
        try {
          ws.send(msg);
        } catch {
          // Ignore disconnected sockets; cleaned up on close.
        }
      }
    };

    if (userSockets.length > 0) {
      void (async () => {
        try {
          push(userSockets)(await buildRooms(null));
        } catch {
          // Swallow per-subscriber errors.
        }
      })();
    }

    for (const ws of staffSockets) {
      const socketUser = getAuthData(ws).socketUser;
      void (async () => {
        try {
          push([ws])(await buildRooms(socketUser ?? null));
        } catch {
          // Swallow per-subscriber errors.
        }
      })();
    }
  }, 5000);
}

function startSettingsPublisher() {
  return setInterval(() => {
    void (async () => {
      try {
        if (isChannelActive('settings')) {
          broadcast('settings', await buildSettings());
        }
      } catch {
        // Swallow errors.
      }
    })();
  }, 5000);
}

// ---------------------------------------------------------------------------
// Immediate snapshot on subscribe
// ---------------------------------------------------------------------------

async function sendInitialSnapshot(channel: string, ws: WSSocket) {
  let data: unknown;
  if (channel.startsWith('chat:')) {
    const messages = await chatSnapshot(channel.slice('chat:'.length));
    if (messages) data = messages;
  } else if (channel === 'leaderboard:money') {
    data = await buildMoneyLeaderboardCached();
  } else if (channel === 'leaderboard:fish') {
    data = await buildFishLeaderboardCached();
  } else if (channel.startsWith('pets:')) {
    data = await buildPets(channel.slice('pets:'.length));
  } else if (channel === 'resources:prices') {
    data = buildResourcePrices();
  } else if (channel === 'market:news') {
    data = buildNewsFeed();
  } else if (channel.startsWith('resources:')) {
    data = buildResourceHistory(channel.slice('resources:'.length), 1);
  } else if (channel === 'settings') {
    data = await buildSettings();
  } else if (channel === 'user:me') {
    const auth = getAuthData(ws);
    const socketUser = auth.socketUser;
    if (socketUser) data = await buildUserSnapshot(socketUser);
  } else if (channel === 'socialRooms') {
    const auth = getAuthData(ws);
    const socketUser = auth.socketUser;
    data = await buildRooms(socketUser);
  } else {
    return;
  }

  if (data === undefined) return;

  try {
    ws.send(JSON.stringify({ type: 'snapshot', channel, data }));
  } catch {
    // Ignore.
  }
}

// ---------------------------------------------------------------------------
// Node WebSocket server (replaces Elysia .ws under Node)
// ---------------------------------------------------------------------------

async function handleSocketMessage(ws: WSSocket, raw: unknown) {
  try {
    const msg =
      typeof raw === 'string'
        ? (JSON.parse(raw) as {
            op?: string;
            channel?: string;
            token?: string;
          })
        : (raw as { op?: string; channel?: string; token?: string });

      if (!msg || typeof msg.op !== 'string') return;

      switch (msg.op) {
        case 'ping': {
          ws.send(JSON.stringify({ type: 'pong', time: Date.now() }));
          break;
        }
        case 'auth': {
          const target = getAuthData(ws);
          if (typeof msg.token === 'string') {
            const session = await getSessionByToken(msg.token);
            if (session) {
              const user = await getUserByUUID(session.user_uuid);
              if (user) {
                // Record the IP on socket auth too, so game clients that live
                // mostly over WebSocket still populate IP history. Uses the same
                // throttled tracking as the HTTP middleware.
                const remoteIp = target.remoteIp;
                if (remoteIp && applyActivityTracking(user, remoteIp)) {
                  await updateUser(user);
                }
                target.socketUser = user ?? undefined;
                if (user) addUserConnection(user.uuid);
              }
            }
          }
          target.socketAuthed = true;
          break;
        }
        case 'subscribe': {
          if (typeof msg.channel !== 'string' || msg.channel.length === 0) return;
          addSubscriber(msg.channel, ws);
          void sendInitialSnapshot(msg.channel, ws);
          break;
        }
        case 'unsubscribe': {
          if (typeof msg.channel !== 'string') return;
          removeSubscriber(msg.channel, ws);
          break;
        }
        case 'user:get': {
          const target = getAuthData(ws);
          const socketUser = target.socketUser;
          if (!socketUser) break;
          const snapshot = await buildUserSnapshot(socketUser);
          if (snapshot) {
            ws.send(JSON.stringify({ type: 'user_snapshot', data: snapshot }));
          }
          break;
        }
        case 'socialRooms:get': {
          const target = getAuthData(ws);
          const socketUser = target.socketUser;
          const snapshot = await buildRooms(socketUser);
          ws.send(JSON.stringify({ type: 'socialRooms_snapshot', data: snapshot }));
          break;
        }
        case 'chat:send': {
          const body = msg as { room_uuid?: string; content?: string };
          const target = getAuthData(ws);
          const socketUser = target.socketUser;
          if (!socketUser) {
            ws.send(
              JSON.stringify({
                type: 'chat:send_result',
                ok: false,
                error: 'Not authenticated',
              })
            );
            break;
          }
          const room_uuid = typeof body.room_uuid === 'string' ? body.room_uuid : '';
          const content = typeof body.content === 'string' ? body.content : '';
          const room = await getRoomByUUID(room_uuid || '');
          const result = await sendChatMessage(socketUser, room ?? null, room_uuid, content);
          ws.send(
            JSON.stringify({
              type: 'chat:send_result',
              ok: result.ok,
              error: result.ok ? undefined : result.message,
            })
          );
          if (result.ok && room_uuid) {
            // Push an up-to-date chat snapshot to subscribers so no HTTP is needed.
            const messages = await chatSnapshot(room_uuid);
            if (messages) broadcast(`chat:${room_uuid}`, messages);

            if (result.message && room) {
              broadcastNewChatMessage(room.name, result.message);
              void notifyNewChatMessage(result.message, room);
            }
          }
          break;
        }
        case 'chat:delete': {
          const body = msg as { message_uuid?: string };
          const target = getAuthData(ws);
          const socketUser = target.socketUser;
          const fail = (error: string) =>
            ws.send(JSON.stringify({ type: 'chat:delete_result', ok: false, error }));
          if (!socketUser) {
            fail('Not authenticated');
            break;
          }
          if (isUserBanned(socketUser)) {
            fail('Forbidden');
            break;
          }
          const delete_uuid = typeof body.message_uuid === 'string' ? body.message_uuid : '';
          const deleteMessage = await getMessageByUUID(delete_uuid);
          if (!deleteMessage) {
            fail('Message not found');
            break;
          }
          if (deleteMessage.sender_uuid !== socketUser.uuid && socketUser.role === 'user') {
            fail('You are not allowed to delete this message');
            break;
          }
          const deleteRoom = await getRoomByUUID(deleteMessage.room_uuid);
          if (!deleteRoom) {
            fail('Room not found');
            break;
          }
          if (deleteRoom.type === 'private' && !hasRole(socketUser.role, 'admin')) {
            fail('You are not allowed to delete messages in this room');
            break;
          }
          if (deleteRoom.restrict_send_to && !hasRole(socketUser.role, deleteRoom.restrict_send_to)) {
            fail('You are not allowed to delete messages in this room');
            break;
          }
          if (!deleteMessage.deleted) {
            deleteMessage.deleted = true;
            deleteMessage.content = '';
            deleteMessage.edited = false;
            deleteMessage.time_edited = Date.now();
            await updateMessage(deleteMessage);
          }
          ws.send(JSON.stringify({ type: 'chat:delete_result', ok: true }));
          if (deleteMessage.room_uuid) {
            const messages = await chatSnapshot(deleteMessage.room_uuid);
            if (messages) broadcast(`chat:${deleteMessage.room_uuid}`, messages);
          }
          break;
        }
        case 'chat:edit': {
          const body = msg as { message_uuid?: string; content?: string };
          const target = getAuthData(ws);
          const socketUser = target.socketUser;
          const fail = (error: string) =>
            ws.send(JSON.stringify({ type: 'chat:edit_result', ok: false, error }));
          if (!socketUser) {
            fail('Not authenticated');
            break;
          }
          if (isUserBanned(socketUser)) {
            fail('Forbidden');
            break;
          }
          const edit_uuid = typeof body.message_uuid === 'string' ? body.message_uuid : '';
          const content = typeof body.content === 'string' ? body.content : '';
          if (!content) {
            fail('Missing content');
            break;
          }
          const editMessage = await getMessageByUUID(edit_uuid);
          if (!editMessage) {
            fail('Message not found');
            break;
          }
          if (editMessage.sender_uuid !== socketUser.uuid && socketUser.role === 'user') {
            fail('You are not allowed to edit this message');
            break;
          }
          const editRoom = await getRoomByUUID(editMessage.room_uuid);
          if (!editRoom) {
            fail('Room not found');
            break;
          }
          if (editRoom.type === 'private' && !hasRole(socketUser.role, 'admin')) {
            fail('You are not allowed to edit messages in this room');
            break;
          }
          if (editRoom.restrict_send_to && !hasRole(socketUser.role, editRoom.restrict_send_to)) {
            fail('You are not allowed to edit messages in this room');
            break;
          }
          if (content.trim() === '') {
            fail('Message content cannot be empty');
            break;
          }
          if (content.length > 300) {
            fail('Message content is too long');
            break;
          }
          const censoredContent = profanityFilter.censorText(content);
          if (
            censoredContent.trim() === '' ||
            censoredContent.replaceAll(/\*+/g, '').trim() === ''
          ) {
            fail('Message content cannot be only profanity');
            break;
          }
          editMessage.content = censoredContent;
          editMessage.edited = true;
          editMessage.time_edited = Date.now();
          await updateMessage(editMessage);
          ws.send(JSON.stringify({ type: 'chat:edit_result', ok: true }));
          if (editMessage.room_uuid) {
            const messages = await chatSnapshot(editMessage.room_uuid);
            if (messages) broadcast(`chat:${editMessage.room_uuid}`, messages);
          }
          break;
        }
        case 'chat:report': {
          const body = msg as { message_uuid?: string; reason?: string; details?: string };
          const target = getAuthData(ws);
          const socketUser = target.socketUser;
          const fail = (error: string) =>
            ws.send(JSON.stringify({ type: 'chat:report_result', ok: false, error }));
          if (!socketUser) {
            fail('Not authenticated');
            break;
          }
          if (isUserBanned(socketUser)) {
            fail('Forbidden');
            break;
          }
          const report_uuid = typeof body.message_uuid === 'string' ? body.message_uuid : '';
          const reason = typeof body.reason === 'string' ? body.reason : '';
          const details = typeof body.details === 'string' ? body.details : undefined;
          if (!report_uuid || !reason) {
            fail('Missing message_uuid or reason');
            break;
          }
          const reported = await getMessageByUUID(report_uuid);
          if (!reported) {
            fail('Message not found');
            break;
          }
          if (reported.ephemeral || reported.sender_uuid === 'nyx') {
            fail('You are not allowed to report this message');
            break;
          }
          if (reported.sender_uuid === socketUser.uuid) {
            fail('You cannot report your own message');
            break;
          }
          const reportedUser = await getUserByUUID(reported.sender_uuid);
          if (!reportedUser) {
            fail('Reported user not found');
            break;
          }
          const category = getCategoryById(reason);
          if (!category) {
            fail('Invalid report reason');
            break;
          }
          if (!category.id.startsWith('social')) {
            fail('Report reason is not valid for social reports');
            break;
          }
          if (hasRole(reportedUser.role, 'admin')) {
            fail('Cannot report this message');
            break;
          }
          const report: IReport = {
            uuid: v4(),
            reporter_uuid: socketUser.uuid,
            message_uuid: report_uuid,
            message_content: reported.content,
            reported_uuid: reportedUser.uuid,
            reason: category.id,
            details,
            status: 'pending',
            time_reported: Date.now(),
          };
          await createReport(report);
          ws.send(JSON.stringify({ type: 'chat:report_result', ok: true }));
          break;
        }
        case 'ephemeral:dismiss': {
          const body = msg as { message_uuid?: string };
          const target = getAuthData(ws);
          const socketUser = target.socketUser;
          const fail = (error: string) =>
            ws.send(JSON.stringify({ type: 'ephemeral:dismiss_result', ok: false, error }));
          if (!socketUser) {
            fail('Not authenticated');
            break;
          }
          const message_uuid = typeof body.message_uuid === 'string' ? body.message_uuid : '';
          const message = await getMessageByUUID(message_uuid || '');
          if (!message) {
            fail('Message not found');
            break;
          }
          if (!message.ephemeral || message.ephemeral_user_uuid !== socketUser.uuid) {
            fail('You are not allowed to dismiss this message');
            break;
          }
          await deleteMessageByUUID(message.uuid);
          ws.send(JSON.stringify({ type: 'ephemeral:dismiss_result', ok: true }));
          if (message.room_uuid) {
            const messages = await chatSnapshot(message.room_uuid);
            if (messages) broadcast(`chat:${message.room_uuid}`, messages);
          }
          break;
        }
      }
    } catch {
      log.debug('Ignored malformed WebSocket message');
    }
}

export function attachSocketServer(server: Server | HttpsServer) {
  const wss = new WebSocketServer({ server, path: '/ws' });
  log.info('WebSocket server attached on /ws');
  wss.on('connection', rawWs => {
    const ws = rawWs as unknown as WSSocket;
    ws.data = {
      remoteIp: (rawWs as { _socket?: { remoteAddress?: string } })._socket?.remoteAddress,
    };
    log.debug('WebSocket client connected');
    let messageChain: Promise<void> = Promise.resolve();
    rawWs.on('message', data => {
      const raw = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
      const text = raw.toString('utf8');
      // Handle messages sequentially per connection so that e.g. `auth` fully
      // resolves before a following `user:get`/`subscribe` is processed. This
      // avoids initial snapshots/requests being dropped while auth is pending,
      // which otherwise delays the client's game hydration on load.
      messageChain = messageChain
        .then(() => handleSocketMessage(ws, text))
        .catch(() => {});
    });
    rawWs.on('close', () => {
      log.debug('WebSocket client disconnected');
      const closingUser = getAuthData(ws).socketUser;
      if (closingUser?.uuid) {
        removeUserConnection(closingUser.uuid);
      }
      for (const [channel, set] of subscribers) {
        if (set.has(ws)) {
          set.delete(ws);
          if (set.size === 0) subscribers.delete(channel);
        }
      }
    });
  });
}

export function setupSocketPublishers() {
  startChatPublisher();
  startLeaderboardPublisher();
  startPetsPublisher();
  startResourcesPublisher();
  startSettingsPublisher();
  startPricesPublisher();
  startNewsPublisher();
  startUserPublisher();
  startRoomsPublisher();
  log.info('All socket publishers started');
}