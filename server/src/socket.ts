import { WebSocketServer } from 'ws';
import type { Server } from 'node:http';
import { getSessionByToken, getUserByUUID, getRoomByUUID } from './db';
import {
  buildFishLeaderboard,
  buildMoneyLeaderboard,
  buildPets,
  buildResourceHistory,
  buildResourcePrices,
  buildRooms,
  buildRoomMessages,
  buildSettings,
  buildUserSnapshot,
} from './helpers/snapshots';
import { sendChatMessage } from './helpers/chat';
import type { IUser } from '../common/models/user';

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

// ---------------------------------------------------------------------------
// Server-side publishers (replace client-side polling)
// ---------------------------------------------------------------------------

function startChatPublisher() {
  return setInterval(() => {
    for (const channel of subscribers.keys()) {
      if (!channel.startsWith('chat:')) continue;
      const roomUuid = channel.slice('chat:'.length);
      void (async () => {
        try {
          const messages = await chatSnapshot(roomUuid);
          if (messages) broadcast(channel, messages);
        } catch {
          // Swallow per-channel errors.
        }
      })();
    }
  }, 1000);
}

function startLeaderboardPublisher() {
  return setInterval(() => {
    void (async () => {
      try {
        if (isChannelActive('leaderboard:money')) {
          broadcast('leaderboard:money', await buildMoneyLeaderboard());
        }
        if (isChannelActive('leaderboard:fish')) {
          broadcast('leaderboard:fish', await buildFishLeaderboard());
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

function startUserPublisher() {
  return setInterval(() => {
    const set = subscribers.get('user:me');
    if (!set || set.size === 0) return;
    for (const ws of set) {
      const auth = getAuthData(ws);
      const socketUser = auth.socketUser;
      if (!socketUser) continue;
      void (async () => {
        try {
          const snapshot = await buildUserSnapshot(socketUser);
          if (!snapshot) return;
          ws.send(JSON.stringify({ type: 'snapshot', channel: 'user:me', data: snapshot }));
        } catch {
          // Swallow per-subscriber errors.
        }
      })();
    }
  }, 1000);
}

function startRoomsPublisher() {
  return setInterval(() => {
    const set = subscribers.get('socialRooms');
    if (!set || set.size === 0) return;
    for (const ws of set) {
      const auth = getAuthData(ws);
      const socketUser = auth.socketUser;
      void (async () => {
        try {
          const snapshot = await buildRooms(socketUser);
          ws.send(JSON.stringify({ type: 'snapshot', channel: 'socialRooms', data: snapshot }));
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
    data = await buildMoneyLeaderboard();
  } else if (channel === 'leaderboard:fish') {
    data = await buildFishLeaderboard();
  } else if (channel.startsWith('pets:')) {
    data = await buildPets(channel.slice('pets:'.length));
  } else if (channel === 'resources:prices') {
    data = buildResourcePrices();
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
              target.socketUser = user ?? undefined;
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
          }
          break;
        }
      }
    } catch {
      // Ignore malformed messages.
    }
}

export function attachSocketServer(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });
  wss.on('connection', rawWs => {
    const ws = rawWs as unknown as WSSocket;
    ws.data = {};
    rawWs.on('message', data => {
      const raw = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
      void handleSocketMessage(ws, raw.toString('utf8'));
    });
    rawWs.on('close', () => {
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
  startUserPublisher();
  startRoomsPublisher();
}