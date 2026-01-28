import { createMessage } from '../db';
import { IMessage } from '../../common/models/message';
import { v4 } from 'uuid';

/**
 * Sends a message from Nyx to a specific user in a specific room.
 * @param recipientUuid - The UUID of the recipient user
 * @param content - The content of the message to send
 * @param room_uuid - The UUID of the room where the message will be sent
 * @param ephemeral - Whether the message should be ephemeral (default: true)
 */
export async function sendNyxMessage(
  recipientUuid: string,
  content: string,
  room_uuid: string,
  ephemeral: boolean = true
): Promise<void> {
  const message: IMessage = {
    uuid: v4(),
    sender_uuid: 'nyx',
    sender_username: '💫 Nyx',
    room_uuid,
    content,
    time_sent: Date.now(),
    edited: false,
    ephemeral: ephemeral,
    ephemeral_user_uuid: recipientUuid,
    sender_badge: 'system',
  };

  await createMessage(message);
}
