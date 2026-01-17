/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

export interface IPet {
  uuid: string;
  owner_uuid: string;
  name: string | null;
  type_id: string;
  level: number;
  time_last_fed: number;
  time_last_played: number;
  time_created: number;
  exp: number;
}

export function petToDoc(p: IPet): IPet {
  return {
    uuid: p.uuid,
    owner_uuid: p.owner_uuid,
    name: p.name,
    type_id: p.type_id,
    level: p.level,
    time_last_fed: p.time_last_fed,
    time_last_played: p.time_last_played,
    time_created: p.time_created,
    exp: p.exp,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function petFromDoc(doc: any): IPet {
  return {
    uuid: doc.uuid || '',
    owner_uuid: doc.owner_uuid || '',
    name: doc.name || '',
    type_id: doc.type_id || '',
    level: doc.level || 1,
    time_last_fed: doc.time_last_fed || 0,
    time_last_played: doc.time_last_played || 0,
    time_created: doc.time_created || 0,
    exp: doc.exp || 0,
  };
}
