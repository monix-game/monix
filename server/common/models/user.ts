/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import type { IFish } from './fish';
import type { IPunishment } from './punishment';
import { DEFAULT_SETTINGS, type ISettings } from './settings';

export interface IPasskey {
  id: string;
  publicKey: Uint8Array;
  counter: number;
  name: string;
  created_at: number;
  transports?: string[];
}

export interface IRecoveryCode {
  code_hash: string;
  used: boolean;
}

/**
 * A pet caught while fishing. It lives in the satchel (not the kennel) until
 * the player spends money to adopt it, which is what makes catchable pets
 * distinct from pets bought from the shop.
 */
export interface IStrayPet {
  uuid: string;
  type_id: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  /** Assigned when the stray is pulled from the water, before adoption. */
  name: string | null;
  caught_at: number;
}

export interface IUserStats {
  playtime_ms: number;
  messages_sent: number;
  resource_buys: number;
  resource_sells: number;
  resources_bought: number;
  resources_sold: number;
  fish_caught: number;
  fish_sold: number;
  /** Stray pets pulled from the water while fishing. */
  pets_caught: number;
  bait_used: number;
  pets_adopted: number;
  pets_fed: number;
  pets_played: number;
  aquarium_upgrades: number;
  daily_rewards_claimed: number;
}

export const DEFAULT_USER_STATS: IUserStats = {
  playtime_ms: 0,
  messages_sent: 0,
  resource_buys: 0,
  resource_sells: 0,
  resources_bought: 0,
  resources_sold: 0,
  fish_caught: 0,
  fish_sold: 0,
  pets_caught: 0,
  bait_used: 0,
  pets_adopted: 0,
  pets_fed: 0,
  pets_played: 0,
  aquarium_upgrades: 0,
  daily_rewards_claimed: 0,
};

export interface IUser {
  uuid: string;
  username: string;
  password_hash: string;
  role: 'owner' | 'admin' | 'mod' | 'helper' | 'user';
  time_created: number;
  last_seen: number;
  settings: ISettings;
  money: number;
  gems: number;
  /**
   * Base pet slots bought with money. The effective limit is this plus any
   * `expanded_kennel` permanent upgrades, capped by PET_SLOT_MIN/MAX.
   */
  pet_slots: number;
  daily_rewards?: {
    last_claimed_day?: number;
    streak?: number;
  };
  totp_secret?: string;
  setup_totp?: boolean;
  passkeys?: IPasskey[];
  recovery_codes?: IRecoveryCode[];
  avatar_data_uri?: string;
  resources: { [key: string]: number };
  cosmetics_unlocked?: string[];
  equipped_cosmetics?: {
    nameplate?: string;
    tag?: string;
  };
  fishing?: {
    equipped_rod?: string;
    rods_owned?: string[];
    equipped_bait?: string;
    bait_owned?: { [key: string]: number };
    fish_caught?: { [key: string]: number };
    event_preview_unlocked?: boolean;
    aquarium: {
      capacity: number;
      level?: number;
      fish: IFish[];
    };
    last_fished_at?: number;
    /**
     * Set when a stray pet is caught instead of keeping the fish. The next
     * eligible catch is auto-sold to make room, then this clears.
     */
    next_catch_auto_sell?: boolean;
    /** Stray pets caught while fishing, waiting to be released from the satchel. */
    satchel?: IStrayPet[];
    sailors?: {
      levels: number[];
      last_collected_at?: number;
      pending_coins?: number;
      fatigue?: number[];
    };
  };
  stats?: IUserStats;
  punishments?: IPunishment[];
  ip_history?: {
    ip: string;
    timestamp: number;
  }[];
  upgrades?: {
    [id: string]: {
      expires_at: number;
    };
  };
  achievements?: string[];
}

export function userToDoc(u: IUser): IUser {
  return {
    uuid: u.uuid,
    username: u.username,
    password_hash: u.password_hash,
    role: u.role,
    time_created: u.time_created,
    last_seen: u.last_seen,
    settings: u.settings,
    money: u.money,
    gems: u.gems,
    pet_slots: u.pet_slots,
    daily_rewards: u.daily_rewards,
    totp_secret: u.totp_secret,
    setup_totp: u.setup_totp,
    passkeys: u.passkeys || [],
    recovery_codes: u.recovery_codes || [],
    avatar_data_uri: u.avatar_data_uri,
    resources: u.resources || {},
    cosmetics_unlocked: u.cosmetics_unlocked || [],
    equipped_cosmetics: u.equipped_cosmetics || {},
    fishing: u.fishing,
    stats: u.stats,
    punishments: u.punishments,
    ip_history: u.ip_history || [],
    upgrades: u.upgrades || {},
    achievements: u.achievements || [],
  };
}

type DocPasskeyPublicKey = Uint8Array | { data?: number[]; buffer?: Uint8Array };

function toPasskeyPublicKey(raw: DocPasskeyPublicKey | undefined | null): Uint8Array {
  if (!raw) return new Uint8Array();
  if (raw instanceof Uint8Array) return raw;
  if (Array.isArray((raw as { data?: unknown }).data)) {
    return Uint8Array.from((raw as { data: number[] }).data);
  }
  const buffer = (raw as { buffer?: unknown }).buffer;
  if (buffer instanceof Uint8Array) {
    return Uint8Array.from(buffer);
  }
  return new Uint8Array();
}

interface RawPasskey {
  id?: string;
  publicKey?: DocPasskeyPublicKey;
  counter?: number;
  name?: string;
  created_at?: number;
  transports?: string[];
}

interface RawRecoveryCode {
  code_hash?: string;
  used?: boolean;
}

interface RawStrayPet {
  uuid?: string;
  type_id?: string;
  rarity?: string;
  name?: string | null;
  caught_at?: number;
}

const STRAY_RARITIES = ['common', 'rare', 'epic', 'legendary'] as const;

/** Defensive parse so a malformed satchel entry can never break a user load. */
function parseSatchel(raw: unknown): IStrayPet[] {
  if (!Array.isArray(raw)) return [];
  const out: IStrayPet[] = [];
  for (const entry of raw as RawStrayPet[]) {
    if (!entry?.uuid || !entry.type_id) continue;
    out.push({
      uuid: entry.uuid,
      type_id: entry.type_id,
      rarity: STRAY_RARITIES.includes(entry.rarity as (typeof STRAY_RARITIES)[number])
        ? (entry.rarity as IStrayPet['rarity'])
        : 'common',
      name: entry.name ?? null,
      caught_at: entry.caught_at || 0,
    });
  }
  return out;
}

/**
 * Applies defaults to the stored fishing block. `doc.fishing` is persisted
 * loosely, so every optional field added over time needs a safe fallback here.
 */
function normalizeFishing(raw: unknown): NonNullable<IUser['fishing']> {
  const f = (raw || {}) as IUser['fishing'] & { satchel?: unknown };

  return {
    ...f,
    equipped_rod: f.equipped_rod ?? 'damaged-rod',
    rods_owned: f.rods_owned?.length ? f.rods_owned : ['damaged-rod'],
    bait_owned: f.bait_owned || {},
    fish_caught: f.fish_caught || {},
    aquarium: f.aquarium || { capacity: 10, level: 1, fish: [] },
    next_catch_auto_sell: f.next_catch_auto_sell ?? false,
    satchel: parseSatchel(f.satchel),
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
    last_seen: doc.last_seen || 0,
    settings: doc.settings || DEFAULT_SETTINGS,
    money: doc.money || 0,
    gems: doc.gems || 0,
    pet_slots: typeof doc.pet_slots === 'number' ? doc.pet_slots : 3,
    daily_rewards: doc.daily_rewards || { last_claimed_day: 0, streak: 0 },
    totp_secret: doc.totp_secret || undefined,
    setup_totp: doc.setup_totp || false,
    passkeys: ((doc.passkeys as RawPasskey[] | undefined) || []).map(pk => ({
      id: pk.id || '',
      publicKey: toPasskeyPublicKey(pk.publicKey),
      counter: pk.counter || 0,
      name: pk.name || 'Passkey',
      created_at: pk.created_at || 0,
      transports: pk.transports || [],
    })),
    recovery_codes: ((doc.recovery_codes as RawRecoveryCode[] | undefined) || []).map(rc => ({
      code_hash: rc.code_hash || '',
      used: rc.used || false,
    })),
    avatar_data_uri: doc.avatar_data_uri || undefined,
    resources: doc.resources || {},
    cosmetics_unlocked: doc.cosmetics_unlocked || [],
    equipped_cosmetics: doc.equipped_cosmetics || {},
    fishing: normalizeFishing(doc.fishing),
    stats: doc.stats || DEFAULT_USER_STATS,
    punishments: doc.punishments || [],
    ip_history: doc.ip_history || [],
    upgrades: doc.upgrades || {},
    achievements: doc.achievements || [],
  };
}

export interface ClientPasskey {
  id: string;
  name: string;
  created_at: number;
  counter: number;
}

export interface ClientUser extends Omit<
  ReturnType<typeof userToDoc>,
  'passkeys' | 'recovery_codes'
> {
  passkeys: ClientPasskey[];
  recovery_codes: undefined;
}

/**
 * Produce a client-safe representation of a user. Passkey public key material
 * (used only for signature verification) and recovery-code hashes are stripped
 * so they are never exposed to the browser.
 */
export function userToClient(u: IUser): ClientUser {
  return {
    ...userToDoc(u),
    passkeys: (u.passkeys || []).map(pk => ({
      id: pk.id,
      name: pk.name,
      created_at: pk.created_at,
      counter: pk.counter,
    })),
    recovery_codes: undefined,
  };
}
