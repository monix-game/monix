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
  is_dead: boolean;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  bond: number;
  passive_earned: number;
  last_passive_collected: number;
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
    is_dead: p.is_dead,
    rarity: p.rarity || 'common',
    bond: p.bond || 0,
    passive_earned: p.passive_earned || 0,
    last_passive_collected: p.last_passive_collected || p.time_created,
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
    is_dead: doc.is_dead || false,
    rarity: doc.rarity || 'common',
    bond: typeof doc.bond === 'number' ? doc.bond : 0,
    passive_earned: typeof doc.passive_earned === 'number' ? doc.passive_earned : 0,
    last_passive_collected:
      typeof doc.last_passive_collected === 'number'
        ? doc.last_passive_collected
        : doc.time_created || 0,
  };
}
