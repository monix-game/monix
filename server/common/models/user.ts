/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import type { IFish } from './fish';
import type { IPunishment } from './punishment';
import { DEFAULT_SETTINGS, type ISettings } from './settings';

export interface IUser {
  uuid: string;
  username: string;
  password_hash: string;
  role: 'owner' | 'admin' | 'mod' | 'helper' | 'user';
  time_created: number;
  settings: ISettings;
  money: number;
  gems: number;
  totp_secret?: string;
  setup_totp?: boolean;
  avatar_data_uri?: string;
  resources: { [key: string]: number };
  cosmetics_unlocked?: string[];
  equipped_cosmetics?: {
    nameplate?: string;
    messageplate?: string;
    tag?: string;
  };
  fishing?: {
    equipped_rod?: string;
    rods_owned?: string[];
    equipped_bait?: string;
    bait_owned?: { [key: string]: number };
    fish_caught?: { [key: string]: number };
    aquarium: {
      capacity: number;
      fish: IFish[];
    };
  };
  punishments?: IPunishment[];
}

export function userToDoc(u: IUser): IUser {
  return {
    uuid: u.uuid,
    username: u.username,
    password_hash: u.password_hash,
    role: u.role,
    time_created: u.time_created,
    settings: u.settings,
    money: u.money,
    gems: u.gems,
    totp_secret: u.totp_secret,
    setup_totp: u.setup_totp,
    avatar_data_uri: u.avatar_data_uri,
    resources: u.resources || {},
    cosmetics_unlocked: u.cosmetics_unlocked || [],
    equipped_cosmetics: u.equipped_cosmetics || {},
    fishing: u.fishing,
    punishments: u.punishments,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function userFromDoc(doc: any): IUser {
  return {
    uuid: doc.uuid || '',
    username: doc.username || '',
    password_hash: doc.password_hash || '',
    role: doc.role || 'user',
    time_created: doc.time_created || 0,
    settings: doc.settings || DEFAULT_SETTINGS,
    money: doc.money || 0,
    gems: doc.gems || 0,
    totp_secret: doc.totp_secret || undefined,
    setup_totp: doc.setup_totp || false,
    avatar_data_uri: doc.avatar_data_uri || undefined,
    resources: doc.resources || {},
    cosmetics_unlocked: doc.cosmetics_unlocked || [],
    equipped_cosmetics: doc.equipped_cosmetics || {},
    fishing: doc.fishing || {
      equipped_rod: 'damaged-rod',
      rods_owned: ['damaged-rod'],
      aquarium: { capacity: 10, fish: [] },
    },
    punishments: doc.punishments || [],
  };
}
