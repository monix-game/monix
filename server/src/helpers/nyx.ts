import { createMessage } from '../db';
import { IMessage } from '../../common/models/message';
import { v4 } from 'uuid';

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
