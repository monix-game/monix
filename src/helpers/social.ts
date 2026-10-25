import type { IRoom } from '../../server/common/models/room';
import type { IMessage } from '../../server/common/models/message';
import { api } from './api';
import type { SocketContextValue } from '../providers/socket';

export type DmSummary = {
  room_uuid: string;
  name: string;
  partner_uuid: string | null;
  partner_username: string | null;
  partner_avatar: string | null;
  partner_role: string | null;
  time_created: number;
};

export async function getDms(): Promise<DmSummary[]> {
  try {
    const resp = await api.get<{ dms: DmSummary[] }>('/social/dm');
    if (resp?.success && resp.data?.dms) return resp.data.dms;
    return [];
  } catch (err) {
    console.error('Error fetching direct messages', err);
    return [];
  }
}

/** Find (or create) the DM conversation with `username` and return its room. */
export async function startDm(username: string): Promise<{ dm: DmSummary; room: IRoom } | null> {
  try {
    const resp = await api.post<{ dm: DmSummary; room: IRoom }>('/social/dm/start', {
      username,
    });
    if (resp?.success && resp.data?.room) return resp.data;
    return null;
  } catch (err) {
    console.error('Error starting direct message', err);
    return null;
  }
}

export async function getAllRooms(): Promise<IRoom[]> {
  try {
    const resp = await api.get<{ rooms: IRoom[] }>('/social/rooms');
    if (resp?.success) {
      const payload = resp.data;
      if (payload?.rooms) {
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
    if (resp?.success) {
      const payload = resp.data;
      if (payload?.messages) {
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
    if (resp?.success) {
      const payload = resp.data;
      if (payload?.message) {
        return payload.message;
      }
    }
    return null;
  } catch (err) {
    console.error('Error sending message', err);
    return null;
  }
}

export async function editMessage(
  message_uuid: string,
  content: string,
  request: SocketContextValue['request']
): Promise<boolean> {
  try {
    const resp = (await request('chat:edit', { message_uuid, content }, 'chat:edit_result')) as {
      ok: boolean;
    };
    return resp?.ok === true;
  } catch (err) {
    console.error('Error editing message', err);
    return false;
  }
}

export async function deleteMessage(
  message_uuid: string,
  request: SocketContextValue['request']
): Promise<boolean> {
  try {
    const resp = (await request('chat:delete', { message_uuid }, 'chat:delete_result')) as {
      ok: boolean;
    };
    return resp?.ok === true;
  } catch (err) {
    console.error('Error deleting message', err);
    return false;
  }
}

export async function dismissEphemeralMessage(
  message_uuid: string,
  request: SocketContextValue['request']
): Promise<boolean> {
  try {
    const resp = (await request(
      'ephemeral:dismiss',
      { message_uuid },
      'ephemeral:dismiss_result'
    )) as { ok: boolean };
    return resp?.ok === true;
  } catch (err) {
    console.error('Error dismissing ephemeral message', err);
    return false;
  }
}

export async function reportMessage(
  message_uuid: string,
  reason: string,
  details: string | undefined,
  request: SocketContextValue['request']
): Promise<boolean> {
  try {
    const resp = (await request(
      'chat:report',
      { message_uuid, reason, details },
      'chat:report_result'
    )) as { ok: boolean };
    return resp?.ok === true;
  } catch (err) {
    console.error('Error reporting message', err);
    return false;
  }
}
