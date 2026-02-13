/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

export interface IRoom {
  uuid: string;
  type: 'public' | 'staff' | 'private';
  name: string;
  time_created: number;
  members?: string[];
  restrict_send_to?: 'owner' | 'admin' | 'mod' | 'helper';
}

export function roomToDoc(m: IRoom): IRoom {
  return {
    uuid: m.uuid,
    type: m.type,
    name: m.name,
    time_created: m.time_created,
    members: m.members,
    restrict_send_to: m.restrict_send_to,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function roomFromDoc(doc: any): IRoom {
  return {
    uuid: doc.uuid || '',
    type: doc.type || 'public',
    name: doc.name || '',
    time_created: doc.time_created || 0,
    members: doc.members || [],
    restrict_send_to: doc.restrict_send_to || undefined,
  };
}
