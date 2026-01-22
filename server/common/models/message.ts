/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

export interface IMessage {
  uuid: string;
  sender_uuid: string;
  sender_username: string;
  sender_role?: string;
  sender_avatar_url?: string;
  room_uuid: string;
  content: string;
  time_sent: number;
  nameplate?: string;
  time_edited?: number;
  edited: boolean;
}

export function messageToDoc(m: IMessage): IMessage {
  return {
    uuid: m.uuid,
    sender_uuid: m.sender_uuid,
    sender_username: m.sender_username,
    sender_role: m.sender_role,
    sender_avatar_url: m.sender_avatar_url,
    room_uuid: m.room_uuid,
    content: m.content,
    time_sent: m.time_sent,
    nameplate: m.nameplate,
    time_edited: m.time_edited,
    edited: m.edited,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function messageFromDoc(doc: any): IMessage {
  return {
    uuid: doc.uuid || '',
    sender_uuid: doc.sender_uuid || '',
    sender_username: doc.sender_username || '',
    sender_role: doc.sender_role || undefined,
    sender_avatar_url: doc.sender_avatar_url || undefined,
    room_uuid: doc.room_uuid || '',
    content: doc.content || '',
    time_sent: doc.time_sent || 0,
    nameplate: doc.nameplate || undefined,
    time_edited: doc.time_edited || undefined,
    edited: doc.edited || false,
  };
}
