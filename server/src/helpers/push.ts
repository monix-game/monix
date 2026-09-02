import { webPush, VAPID_CONFIGURED } from '../constants';
import type { IPushSubscription } from '../../common/models/pushSubscription';
import { IMessage } from '../../common/models/message';
import { IRoom } from '../../common/models/room';
import {
  deletePushSubscriptionByEndpoint,
  getAllPushSubscriptions,
  getPushSubscriptionsByUserUUID,
  getUserByUUID,
} from '../db';
import { isUserOnline } from './presence';
import { createLogger } from '../logging';

const log = createLogger('push');

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

const NOTIFICATION_ICON = '/android-chrome-192x192.png';

/**
 * Send a push message to every subscription owned by a user. Removes
 * subscriptions that have become invalid (410 Gone / 404 Not Found).
 * Resolves to the number of successfully sent pushes.
 */
export async function sendPushToUser(user_uuid: string, payload: PushPayload): Promise<number> {
  if (!VAPID_CONFIGURED) return 0;
  const subscriptions = await getPushSubscriptionsByUserUUID(user_uuid);
  if (subscriptions.length === 0) return 0;

  const json = JSON.stringify({
    ...payload,
    icon: payload.icon || NOTIFICATION_ICON,
  });

  let sent = 0;
  for (const sub of subscriptions) {
    try {
      if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) continue;
      await webPush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
        },
        json
      );
      sent += 1;
    } catch (err) {
      const statusCode =
        (err as { statusCode?: number }).statusCode ??
        (err as { status?: number }).status;
      if (statusCode === 404 || statusCode === 410) {
        await deletePushSubscriptionByEndpoint(sub.endpoint).catch(() => {
          /* ignore */
        });
      } else {
        log.warn({ err, statusCode, user_uuid }, 'Failed to send push notification for user');
      }
    }
  }
  return sent;
}

export async function sendPushToSubscriptions(
  subscriptions: IPushSubscription[],
  payload: PushPayload
): Promise<void> {
  if (!VAPID_CONFIGURED) return;
  const json = JSON.stringify({
    ...payload,
    icon: payload.icon || NOTIFICATION_ICON,
  });
  for (const sub of subscriptions) {
    try {
      if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) continue;
      await webPush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
        },
        json
      );
    } catch (err) {
      const statusCode =
        (err as { statusCode?: number }).statusCode ??
        (err as { status?: number }).status;
      if (statusCode === 404 || statusCode === 410) {
        await deletePushSubscriptionByEndpoint(sub.endpoint).catch(() => {
          /* ignore */
        });
      }
    }
  }
}

function canViewRoom(role: string, room: IRoom): boolean {
  if (room.type === 'public') return true;
  if (room.type === 'staff') return role !== 'user';
  if (room.type === 'private') return true; // members checked separately below
  return false;
}

/**
 * Notify the offline members of a chat room about a newly sent message.
 * Online users are skipped (the live UI handles them via the dot + toasts).
 * Only users with at least one push subscription are considered.
 */
export async function notifyNewChatMessage(message: IMessage, room: IRoom | null): Promise<void> {
  if (!VAPID_CONFIGURED) return;
  if (message.sender_uuid === 'nyx') return;
  if (message.ephemeral) return;
  if (!room) return;

  const roomName = room.name || 'Chat';
  const senderName = message.sender_username || 'Someone';
  const body = `${senderName}: ${message.content || 'Sent a message'}`.slice(0, 140);

  // Distinct users that own at least one push subscription.
  const subscriptions = await getAllPushSubscriptions();
  const usersByUuid = new Map<string, IPushSubscription[]>();
  for (const sub of subscriptions) {
    if (!usersByUuid.has(sub.user_uuid)) usersByUuid.set(sub.user_uuid, []);
    usersByUuid.get(sub.user_uuid)!.push(sub);
  }

  for (const [user_uuid, userSubs] of usersByUuid) {
    if (user_uuid === message.sender_uuid) continue;
    if (isUserOnline(user_uuid)) continue;

    const user = await getUserByUUID(user_uuid);
    if (!user) continue;
    if (!user.settings?.notifications_enabled) continue;
    if (!canViewRoom(user.role, room)) continue;
    if (room.type === 'private' && !room.members?.includes(user_uuid)) continue;

    await sendPushToSubscriptions(userSubs, {
      title: roomName,
      body,
      tag: `monix-${user_uuid}`,
      data: {
        url: '/game?tab=social',
      },
    });
  }
}
