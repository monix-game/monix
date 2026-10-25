/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

export interface IRoom {
  uuid: string;
  type: 'public' | 'staff' | 'private' | 'dm';
  name: string;
  time_created: number;
  members?: string[];
  restrict_send_to?: 'owner' | 'admin' | 'mod' | 'helper';
  /**
   * Deterministic key for a DM room, built from the two participant UUIDs in
   * sorted order. Lets a conversation be found (and de-duplicated) without a
   * second lookup table.
   */
  dm_key?: string;
}

export function roomToDoc(m: IRoom): IRoom {
  return {
    uuid: m.uuid,
    type: m.type,
    name: m.name,
    time_created: m.time_created,
    members: m.members,
    restrict_send_to: m.restrict_send_to,
    dm_key: m.dm_key,
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
    dm_key: doc.dm_key || undefined,
  };
}

/** Stable, order-independent key for a pair of DM participants. */
export function buildDmKey(a: string, b: string): string {
  return [a, b].sort().join(':');
}
