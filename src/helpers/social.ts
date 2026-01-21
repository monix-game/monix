import type { IRoom } from '../../server/common/models/room';
import type { IMessage } from '../../server/common/models/message';
import { api } from './api';

export async function getAllRooms(): Promise<IRoom[]> {
  try {
    const resp = await api.get<{ rooms: IRoom[] }>('/social/rooms');
    if (resp && resp.success) {
      const payload = resp.data;
      if (payload && payload.rooms) {
        return payload.rooms;
      }
    }
    return [];
  } catch (err) {
    console.error('Error fetching rooms', err);
    return [];
  }
}

export async function getRoomMessages(room_uuid: string): Promise<IMessage[]> {
  try {
    const resp = await api.get<{ messages: IMessage[] }>(`/social/room/${room_uuid}/messages`);
    if (resp && resp.success) {
      const payload = resp.data;
      if (payload && payload.messages) {
        return payload.messages;
      }
    }
    return [];
  } catch (err) {
    console.error('Error fetching room messages', err);
    return [];
  }
}

export async function sendMessage(room_uuid: string, content: string): Promise<IMessage | null> {
  try {
    const resp = await api.post<{ message: IMessage }>('/social/send', {
      room_uuid,
      content,
    });
    if (resp && resp.success) {
      const payload = resp.data;
      if (payload && payload.message) {
        return payload.message;
      }
    }
    return null;
  } catch (err) {
    console.error('Error sending message', err);
    return null;
  }
}
