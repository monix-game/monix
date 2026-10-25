import { v4 } from 'uuid';
import { createRoom, getAllRooms, getUserByUsername, getUserByUUID, updateRoom } from '../db';
import { buildDmKey, type IRoom } from '../../common/models/room';
import type { IUser } from '../../common/models/user';

export type DmStartResult =
  { ok: true; room: IRoom; created: boolean } | { ok: false; status: number; error: string };

/**
 * Find (or create) the DM room between two users.
 *
 * DM rooms are looked up by their deterministic `dm_key` rather than by uuid so
 * that two people can never end up with two parallel conversations, and so the
 * lookup stays a single pass over the (small, cached) room list.
 */
export async function getOrCreateDmRoom(
  initiator: IUser,
  recipientUuid: string
): Promise<DmStartResult> {
  if (!recipientUuid) {
    return { ok: false, status: 400, error: 'Missing recipient' };
  }

  if (recipientUuid === initiator.uuid) {
    return { ok: false, status: 400, error: 'You cannot direct message yourself' };
  }

  const recipient = await getUserByUUID(recipientUuid);
  if (!recipient) {
    return { ok: false, status: 404, error: 'User not found' };
  }

  const dmKey = buildDmKey(initiator.uuid, recipient.uuid);
  const rooms = await getAllRooms();
  const existing = rooms.find(room => room.type === 'dm' && room.dm_key === dmKey);
  if (existing) {
    // Defensive: repair the member list if an older/partial record is missing
    // it, and persist the repair so both participants keep access after the
    // room cache expires.
    if (existing.members?.length !== 2) {
      existing.members = [initiator.uuid, recipient.uuid];
      await updateRoom(existing);
    }
    return { ok: true, room: existing, created: false };
  }

  const room: IRoom = {
    uuid: `dm-${v4()}`,
    type: 'dm',
    name: recipient.username,
    time_created: Date.now(),
    members: [initiator.uuid, recipient.uuid],
    dm_key: dmKey,
  };

  await createRoom(room);
  return { ok: true, room, created: true };
}

export async function getOrCreateDmRoomByUsername(
  initiator: IUser,
  username: string
): Promise<DmStartResult> {
  const recipient = await getUserByUsername(username);
  if (!recipient) {
    return { ok: false, status: 404, error: 'User not found' };
  }
  return getOrCreateDmRoom(initiator, recipient.uuid);
}

/** Every DM room the given user participates in, newest first. */
export async function listDmRooms(userUuid: string): Promise<IRoom[]> {
  const rooms = await getAllRooms();
  return rooms
    .filter(room => room.type === 'dm' && room.members?.includes(userUuid))
    .sort((a, b) => b.time_created - a.time_created);
}
