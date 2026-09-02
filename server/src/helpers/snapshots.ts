import {
  getAllRooms,
  getAllUsers,
  getGlobalSettings,
  getMessagesByRoomUUID,
  getPetsByOwnerUUID,
  getRoomByUUID,
  getUserByUUID,
  updateUser,
} from '../db';
import { generatePrice } from './market';
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
import { getCurrentFishingEvent, applyAquariumEventModifiers } from '../../common/fishing/fishing';

type Role = 'owner' | 'admin' | 'mod' | 'helper' | 'user';

export type LeaderboardEntry = {
  rank: number;
  username: string;
  avatar: string | undefined;
  role: Role;
  money?: number;
  fishCaught?: number;
  magic_jellybean_active: boolean;
  cosmetics: {
    nameplate: string | undefined;
    user_tag: string | undefined;
  };
};

type LeaderboardSet = { normal: LeaderboardEntry[]; noStaff: LeaderboardEntry[] };

const SIX_MONTHS = 6 * 30 * 24 * 60 * 60 * 1000;

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
        !isUserBanned(u) &&
        (u.money || 0) > 0 &&
        (!u.last_seen || now - u.last_seen <= SIX_MONTHS)
    )
    .sort((a, b) => (b.money || 0) - (a.money || 0))
    .slice(0, 15);

  const entryFor = (u: IUser, index: number): LeaderboardEntry => ({
    ...entryForUser(u, u.money || 0, 0),
    rank: index,
  });

  const normal = rankLeaderboard(rankable, entryFor, false);
  const noStaff = rankLeaderboard(rankable, entryFor, true);

  return { normal, noStaff };
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

export type RoomMessagesResult =
  | { messages: ReturnType<typeof messageToDoc>[] }
  | { error: 'room_not_found' | 'forbidden' };

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

  const senderUpgradeCache = new Map<string, boolean>();
  const senderCosmeticCache = new Map<string, { nameplate?: string; user_tag?: string }>();
  const now = Date.now();
  const hydratedMessages = await Promise.all(
    filteredMessages.map(async message => {
      if (!senderUpgradeCache.has(message.sender_uuid)) {
        const sender = await getUserByUUID(message.sender_uuid);
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
    })
  );

  return { messages: hydratedMessages.map(m => messageToDoc(m)) };
}

export async function buildPets(userUuid: string) {
  await updatePlayersPets(userUuid);
  return (await getPetsByOwnerUUID(userUuid)).map(petToDoc).sort((a, b) => a.time_created - b.time_created);
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

  const currentEvent = getCurrentFishingEvent();
  const aquariumFish = freshUser.fishing?.aquarium?.fish ?? [];
  if (applyAquariumEventModifiers(aquariumFish, currentEvent)) {
    await updateUser(freshUser);
  }

  return { user: userToDoc(freshUser) };
}