import { v4 } from 'uuid';
import { createMessage, updateUser } from '../db';
import { profanityFilter } from '../constants';
import type { IMessage } from '../../common/models/message';
import { getCategoryById } from '../../common/punishx/categories';
import { sendNyxMessage } from './nyx';
import { handleCommand } from './commands';
import { hasRole } from '../../common/roles';
import { checkSocialSpam } from './spamModeration';
import { punishUser } from '../../common/punishx/punishx';
import { isUpgradeActive, MAGIC_JELLYBEAN_UPGRADE_ID } from '../../common/upgrades';
import type { IUser } from '../../common/models/user';
import type { IRoom } from '../../common/models/room';

export type ChatSendResult =
  | { ok: true; status: number; message: IMessage | null }
  | { ok: false; status: number; message: string };

/**
 * Shared chat-message send logic used by both the HTTP route and the WebSocket
 * channel, so the two never drift apart.
 */
export async function sendChatMessage(
  fetchedUser: IUser,
  room: IRoom | null,
  room_uuid: string,
  rawContent: string
): Promise<ChatSendResult> {
  if (!fetchedUser) {
    return { ok: false, status: 404, message: 'User not found' };
  }

  if (!room_uuid || !rawContent) {
    return { ok: false, status: 400, message: 'Missing room_uuid or content' };
  }

  if (!room) {
    return { ok: false, status: 404, message: 'Room not found' };
  }

  // Check if user is allowed to send message in the room
  if (room.type === 'staff' && fetchedUser.role === 'user') {
    return { ok: false, status: 403, message: 'You are not allowed to send messages in this room' };
  }

  if (room.type === 'private' && room.members && !room.members.includes(fetchedUser.uuid)) {
    return {
      ok: false,
      status: 403,
      message: 'You are not allowed to send messages in this room',
    };
  }

  if (room.restrict_send_to && !hasRole(fetchedUser.role, room.restrict_send_to)) {
    return { ok: false, status: 403, message: 'You are not allowed to send messages in this room' };
  }

  const content = rawContent;

  // Make sure the content is not empty after trimming
  if (content.trim() === '') {
    return { ok: false, status: 400, message: 'Message content cannot be empty' };
  }

  // Make sure the content is not too long
  if (content.length > 300) {
    await sendNyxMessage(
      fetchedUser.uuid,
      'Your message was not sent because it exceeds the maximum length of 300 characters.',
      room_uuid
    );
    return { ok: false, status: 400, message: 'Message content is too long' };
  }

  // Censor the message content
  const censoredContent = profanityFilter.censorText(content);

  // Check if the censored content is empty
  if (censoredContent.trim() === '' || censoredContent.replaceAll(/\*+/g, '').trim() === '') {
    await sendNyxMessage(
      fetchedUser.uuid,
      'Your message was not sent because it contains only profanity. Please adhere to our community guidelines.',
      room_uuid
    );
    return { ok: false, status: 400, message: 'Message content cannot be only profanity' };
  }

  const isPublicRoom = room.type === 'public';
  const isModOrHigher = hasRole(fetchedUser.role, 'mod');

  if (isPublicRoom && !isModOrHigher) {
    const spamDecision = checkSocialSpam({
      user_uuid: fetchedUser.uuid,
      room_uuid,
      content,
    });

    if (spamDecision.isSpam) {
      const reasons = spamDecision.reasons.map(reason => reason.name).join(', ');

      if (spamDecision.shouldAutoBan) {
        const category = getCategoryById('social/chat/spam');
        if (category) {
          punishUser(fetchedUser, category, 'nyx', `Auto moderation: ${reasons}`);
          await updateUser(fetchedUser);
        }
      }

      await sendNyxMessage(
        fetchedUser.uuid,
        `Your message was blocked by auto moderation (${reasons}).`,
        room_uuid
      );

      return { ok: false, status: 403, message: 'Message blocked by auto moderation' };
    }
  }

  // Check if the message contains links (not allowed in social rooms except for staff)
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  if (urlRegex.test(content) && fetchedUser.role === 'user') {
    await sendNyxMessage(
      fetchedUser.uuid,
      'Links are not allowed in social rooms. Please use direct messaging for sharing links.',
      room_uuid
    );
    return { ok: false, status: 400, message: 'Messages cannot contain links' };
  }

  const originalMessage: IMessage = {
    uuid: v4(),
    sender_uuid: fetchedUser.uuid,
    sender_username: fetchedUser.username,
    sender_badge: fetchedUser.role === 'user' ? undefined : fetchedUser.role,
    sender_avatar_url: fetchedUser.avatar_data_uri,
    room_uuid,
    content: censoredContent,
    deleted: false,
    sent_restricted: !!room.restrict_send_to,
    restricted_role: room.restrict_send_to,
    nameplate: fetchedUser.equipped_cosmetics?.nameplate,
    sender_magic_jellybean_active: isUpgradeActive(fetchedUser.upgrades, MAGIC_JELLYBEAN_UPGRADE_ID),
    user_tag: fetchedUser.equipped_cosmetics?.tag,
    time_sent: Date.now(),
    edited: false,
    shouted: false,
  };

  const processed = await handleCommand(originalMessage, fetchedUser, room_uuid);

  if (processed.error) {
    return { ok: false, status: 400, message: processed.error };
  }

  if (!processed.message) {
    return { ok: true, status: 200, message: null };
  }

  const processedMessage = processed.message;

  await createMessage(processedMessage);

  return { ok: true, status: 201, message: processedMessage };
}

export type { IRoom };
