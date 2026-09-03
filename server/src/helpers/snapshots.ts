import {
  getAllRooms,
  getAllUsers,
  getGlobalSettings,
  getMessagesByRoomUUID,
  getRoomByUUID,
  getUsersByUUID,
  getUserByUUID,
  getPetsByOwnerUUID,
  updateUser,
} from '../db';
import { generatePrice } from './market';
import { buildMarketNewsFeed } from '../../common/market/news';
import { messageToDoc } from '../../common/models/message';
import { petToDoc } from '../../common/models/pet';
import { roomToDoc } from '../../common/models/room';
import { userToDoc } from '../../common/models/user';
import type { IUser } from '../../common/models/user';
import { isUserBanned } from '../../common/punishx/punishx';
import { isUpgradeActive, MAGIC_JELLYBEAN_UPGRADE_ID } from '../../common/upgrades';
import { hasRole } from '../../common/roles';
import { updatePlayersPets } from '../routes/pets/helpers';
import { resources } from '../../common/resources';
import { getFishValue } from '../../common/fishing/fishing';
import { fishingRods } from '../../common/fishing/fishingRods';
import { fishingBaits } from '../../common/fishing/fishingBait';
import { getPendingSailorEarnings } from './sailors';
import { unlockEligibleAchievements } from '../../common/achievements';

type Role = 'owner' | 'admin' | 'mod' | 'helper' | 'user';

export type LeaderboardEntry = {
  rank: number;
  username: string;
  avatar: string | undefined;
  role: Role;
  money?: number;
  fishCaught?: number;
  playtimeMs?: number;
  netWorth?: number;
  magic_jellybean_active: boolean;
  cosmetics: {
    nameplate: string | undefined;
    user_tag: string | undefined;
  };
};

type LeaderboardSet = { normal: LeaderboardEntry[]; noStaff: LeaderboardEntry[] };

const SIX_MONTHS = 6 * 30 * 24 * 60 * 60 * 1000;

/**
 * Tiny TTL memoizer used to deduplicate overlapping calls to expensive
 * snapshot builders (e.g. the leaderboard publisher tick + on-subscribe
 * initial snapshots + HTTP leaderboard routes all firing within the same
 * window would otherwise each re-scan the whole users collection).
 */
function ttlCache<T>(fn: () => Promise<T>, ttlMs: number): () => Promise<T> {
  let value: T | undefined;
  let expiresAt = 0;
  return async () => {
    const now = Date.now();
    if (value !== undefined && now < expiresAt) return value;
    value = await fn();
    expiresAt = now + ttlMs;
    return value;
  };
}

export const buildMoneyLeaderboardCached = ttlCache(buildMoneyLeaderboard, 10_000);
export const buildFishLeaderboardCached = ttlCache(buildFishLeaderboard, 10_000);
export const buildPlaytimeLeaderboardCached = ttlCache(buildPlaytimeLeaderboard, 10_000);

function isNotStaff(user: { role: string }, hideStaff: boolean): boolean {
  return !hideStaff || (user.role !== 'owner' && user.role !== 'admin' && user.role !== 'mod');
}

function finishLeaderboard(leaderboard: LeaderboardEntry[]): LeaderboardEntry[] {
  const limited = leaderboard.slice(0, 15);
  return [limited[1], limited[0], limited[2], ...limited.slice(3)].filter(
    (entry): entry is LeaderboardEntry => entry != null
  );
}

function entryForUser(user: IUser, money: number, fishCaught: number): LeaderboardEntry {
  return {
    rank: 0,
    username: user.username || 'Unknown',
    avatar: user.avatar_data_uri,
    role: user.role,
    money,
    fishCaught,
    magic_jellybean_active: isUpgradeActive(user.upgrades, MAGIC_JELLYBEAN_UPGRADE_ID),
    cosmetics: {
      nameplate: user.equipped_cosmetics?.nameplate,
      user_tag: user.equipped_cosmetics?.tag,
    },
  };
}

function rankLeaderboard<T>(
  rankedUsers: T[],
  entryFor: (user: T, index: number) => LeaderboardEntry,
  hideStaff: boolean
): LeaderboardEntry[] {
  const filtered = hideStaff
    ? rankedUsers.filter(u => isNotStaff(u as { role: string }, true))
    : rankedUsers;
  return finishLeaderboard(filtered.map((user, index) => entryFor(user, index + 1)));
}

export async function buildMoneyLeaderboard(): Promise<LeaderboardSet> {
  const allUsers = await getAllUsers();
  const now = Date.now();
  const rankable = allUsers
    .filter(
      u =>
        !isUserBanned(u) && (u.money || 0) > 0 && (!u.last_seen || now - u.last_seen <= SIX_MONTHS)
    )
    .map(u => ({ user: u, netWorth: computeNetWorth(u, now) }))
    .filter(x => x.netWorth > 0)
    .sort((a, b) => b.netWorth - a.netWorth)
    .slice(0, 15);

  const entryFor = (u: { user: IUser; netWorth: number }, index: number): LeaderboardEntry => ({
    ...entryForUser(u.user, u.user.money || 0, 0),
    netWorth: u.netWorth,
    rank: index,
  });

  const normal = rankLeaderboard(rankable, entryFor, false);
  const noStaff = rankLeaderboard(rankable, entryFor, true);

  return { normal, noStaff };
}

/**
 * Approximate a user's liquid net worth (bank cash + holdings valued at their
 * current resale worth): resources at the live market price, owned rods/bait at
 * purchase cost, and aquarium fish at their sell value. Gems are excluded since
 * they are a premium/admin-issued currency with no defined exchange rate.
 */
function computeNetWorth(user: IUser, nowMs: number): number {
  const nowSeconds = Math.floor(nowMs / 1000);

  let total = user.money || 0;

  for (const [resourceId, quantity] of Object.entries(user.resources || {})) {
    if (quantity <= 0) continue;
    total += generatePrice(resourceId, nowSeconds) * quantity;
  }

  for (const rodId of user.fishing?.rods_owned || []) {
    const rod = fishingRods.find(r => r.id === rodId);
    if (rod && rod.buyable !== false) total += rod.price;
  }

  for (const [baitId, quantity] of Object.entries(user.fishing?.bait_owned || {})) {
    if (quantity <= 0) continue;
    const bait = fishingBaits.find(b => b.id === baitId);
    if (bait) total += bait.price * quantity;
  }

  for (const fish of user.fishing?.aquarium?.fish || []) {
    total += getFishValue(fish);
  }

  return Math.floor(total * 100) / 100;
}

function getFishCaughtCount(fishCaught?: { [key: string]: number }): number {
  if (!fishCaught) return 0;
  return Object.values(fishCaught).reduce((total, count) => total + count, 0);
}

export async function buildFishLeaderboard(): Promise<LeaderboardSet> {
  const allUsers = await getAllUsers();
  const now = Date.now();
  // Precompute once instead of re-reducing on every sort comparison.
  const counted = allUsers.map(u => {
    const fishCaught = getFishCaughtCount(u.fishing?.fish_caught);
    return { user: u, count: fishCaught };
  });
  const rankable = counted
    .filter(
      u =>
        !isUserBanned(u.user) &&
        u.count > 0 &&
        (!u.user.last_seen || now - u.user.last_seen <= SIX_MONTHS)
    )
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  const entryFor = (u: { user: IUser; count: number }, index: number): LeaderboardEntry => ({
    ...entryForUser(u.user, u.user.money || 0, u.count),
    rank: index,
  });

  const normal = rankLeaderboard(rankable, entryFor, false);
  const noStaff = rankLeaderboard(rankable, entryFor, true);

  return { normal, noStaff };
}

export async function buildPlaytimeLeaderboard(): Promise<LeaderboardSet> {
  const allUsers = await getAllUsers();
  const now = Date.now();
  const counted = allUsers.map(u => {
    const playtimeMs = u.stats?.playtime_ms || 0;
    return { user: u, playtimeMs };
  });
  const rankable = counted
    .filter(
      u =>
        !isUserBanned(u.user) &&
        u.playtimeMs > 0 &&
        (!u.user.last_seen || now - u.user.last_seen <= SIX_MONTHS)
    )
    .sort((a, b) => b.playtimeMs - a.playtimeMs)
    .slice(0, 15);

  const entryFor = (u: { user: IUser; playtimeMs: number }, index: number): LeaderboardEntry => ({
    ...entryForUser(u.user, u.user.money || 0, 0),
    playtimeMs: u.playtimeMs,
    rank: index,
  });

  const normal = rankLeaderboard(rankable, entryFor, false);
  const noStaff = rankLeaderboard(rankable, entryFor, true);

  return { normal, noStaff };
}

export type RoomMessagesResult =
  { messages: ReturnType<typeof messageToDoc>[] } | { error: 'room_not_found' | 'forbidden' };

export async function buildRoomMessages(
  roomUuid: string,
  viewer?: { uuid: string; role: Role } | null
): Promise<RoomMessagesResult> {
  const room = await getRoomByUUID(roomUuid);
  if (!room) return { error: 'room_not_found' };

  if (viewer) {
    if (room.type === 'staff' && viewer.role === 'user') return { error: 'forbidden' };
    if (
      room.type === 'private' &&
      room.members &&
      !room.members.includes(viewer.uuid) &&
      !hasRole(viewer.role, 'admin')
    ) {
      return { error: 'forbidden' };
    }
  }

  const messages = await getMessagesByRoomUUID(roomUuid);
  const filteredMessages = messages.filter(m => {
    if (m.deleted) return false;
    if (viewer && m.ephemeral && m.ephemeral_user_uuid !== viewer.uuid) return false;
    return true;
  });

  // Hydrate sender cosmetics/upgrades from a single batched query instead of
  // one DB round-trip per unique sender (a busy room with 50 senders used to
  // cost 50 reads per snapshot; every message send triggers a snapshot).
  const senderUuids = Array.from(new Set(filteredMessages.map(m => m.sender_uuid).filter(Boolean)));
  const senders = senderUuids.length > 0 ? await getUsersByUUID(senderUuids) : [];
  const senderById = new Map(senders.map(s => [s.uuid, s]));
  const senderUpgradeCache = new Map<string, boolean>();
  const senderCosmeticCache = new Map<string, { nameplate?: string; user_tag?: string }>();
  const now = Date.now();
  const hydratedMessages = filteredMessages.map(message => {
    const sender = senderById.get(message.sender_uuid);
    if (!senderUpgradeCache.has(message.sender_uuid)) {
      senderUpgradeCache.set(
        message.sender_uuid,
        isUpgradeActive(sender?.upgrades, MAGIC_JELLYBEAN_UPGRADE_ID, now)
      );
      senderCosmeticCache.set(message.sender_uuid, {
        nameplate: sender?.equipped_cosmetics?.nameplate,
        user_tag: sender?.equipped_cosmetics?.tag,
      });
    }
    const cosmetics = senderCosmeticCache.get(message.sender_uuid) || {};
    return {
      ...message,
      sender_magic_jellybean_active: senderUpgradeCache.get(message.sender_uuid) || false,
      nameplate: message.nameplate ?? cosmetics.nameplate,
      user_tag: message.user_tag ?? cosmetics.user_tag,
    };
  });

  return { messages: hydratedMessages.map(m => messageToDoc(m)) };
}

export async function buildPets(userUuid: string) {
  const pets = await updatePlayersPets(userUuid);
  return pets.map(petToDoc).sort((a, b) => a.time_created - b.time_created);
}

export function buildResourceHistory(
  resourceId: string,
  hoursBack: number
): Array<{ time: number; price: number }> {
  const currentTime = Math.floor(Date.now() / 1000);
  const data: Array<{ time: number; price: number }> = [];
  const totalPoints = Math.max(0, Math.floor(hoursBack) * 720);
  for (let i = 0; i < totalPoints; i++) {
    const timestamp = currentTime - i * 5;
    data.push({ time: timestamp, price: generatePrice(resourceId, timestamp) });
  }
  data.reverse();
  return data;
}

export async function buildSettings() {
  return { settings: await getGlobalSettings() };
}

/** Prices for every resource at the current timestamp (dedup with /market/prices). */
export function buildResourcePrices(): { [resourceId: string]: number } {
  const time = Math.floor(Date.now() / 1000);
  const data: { [resourceId: string]: number } = {};
  for (const r of resources) {
    data[r.id] = generatePrice(r.id, time);
  }
  return data;
}

/**
 * Percentage change for every resource over the last 45 seconds, e.g. +2.4 | -0.8.
 * Mirrors the change shown on the ResourceGraph, which compares the first and
 * last of its last-10-point (5s-spaced) window.
 */
export function buildResourceChanges(): { [resourceId: string]: number } {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - 45;
  const data: { [resourceId: string]: number } = {};
  for (const r of resources) {
    const current = generatePrice(r.id, now);
    const previous = generatePrice(r.id, windowStart);
    data[r.id] = previous > 0 ? ((current - previous) / previous) * 100 : 0;
  }
  return data;
}

/** Current market news feed (dedup with /market/news). */
export function buildNewsFeed() {
  return buildMarketNewsFeed(Math.floor(Date.now() / 1000));
}

/** Rooms visible to a given viewer (dedup with /social/rooms). */
export async function buildRooms(viewer?: { uuid: string; role: string } | null) {
  const rooms = await getAllRooms();
  const filteredRooms = rooms.filter(r => {
    if (r.type === 'public') return true;
    if (r.type === 'staff' && viewer && viewer.role !== 'user') return true;
    if (r.type === 'private' && viewer && r.members?.includes(viewer.uuid)) return true;
    return false;
  });
  return { rooms: filteredRooms.map(r => roomToDoc(r)) };
}

/** Current user document (dedup with /user). */
export async function buildUserSnapshot(user: {
  uuid: string;
}): Promise<{ user: ReturnType<typeof userToDoc> } | null> {
  const freshUser = await getUserByUUID(user.uuid);
  if (!freshUser) return null;
  if (freshUser.fishing?.sailors) {
    freshUser.fishing.sailors.pending_coins = getPendingSailorEarnings(freshUser);
  }
  const pets = await getPetsByOwnerUUID(freshUser.uuid);
  const achievements = unlockEligibleAchievements(
    { ...freshUser, petsOwned: pets.length },
    freshUser.achievements
  );
  if (achievements.length !== (freshUser.achievements || []).length) {
    freshUser.achievements = achievements;
    await updateUser(freshUser);
  }
  return { user: userToDoc(freshUser) };
}
