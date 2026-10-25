import { Elysia, t } from 'elysia';
import { getUserByUUID, getUsersByUUID } from '../../db';
import { deriveAuth, onlyActive } from '../../middleware';
import { listDmRooms, getOrCreateDmRoomByUsername } from '../../helpers/dm';
import { roomToDoc } from '../../../common/models/room';
import type { IRoom } from '../../../common/models/room';

type DmSummary = {
  room_uuid: string;
  name: string;
  partner_uuid: string | null;
  partner_username: string | null;
  partner_avatar: string | null;
  partner_role: string | null;
  time_created: number;
};

async function summariseRooms(rooms: IRoom[], viewerUuid: string): Promise<DmSummary[]> {
  if (rooms.length === 0) return [];

  // Resolve every counterpart in one batched query rather than N reads.
  const partnerUuids = Array.from(
    new Set(
      rooms
        .map(room => (room.members || []).find(uuid => uuid !== viewerUuid))
        .filter((uuid): uuid is string => Boolean(uuid))
    )
  );
  const partners = partnerUuids.length > 0 ? await getUsersByUUID(partnerUuids) : [];
  const byUuid = new Map(partners.map(p => [p.uuid, p]));

  return rooms.map(room => {
    const partnerUuid = (room.members || []).find(uuid => uuid !== viewerUuid) ?? null;
    const partner = partnerUuid ? byUuid.get(partnerUuid) : undefined;
    return {
      room_uuid: room.uuid,
      // Prefer the live username so a rename is reflected immediately.
      name: partner?.username || room.name,
      partner_uuid: partnerUuid,
      partner_username: partner?.username ?? null,
      partner_avatar: partner?.avatar_data_uri ?? null,
      partner_role: partner?.role ?? null,
      time_created: room.time_created,
    };
  });
}

export const dms = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .get('/dm', async ({ authUser, set }) => {
    const viewer = await getUserByUUID(authUser?.uuid as string);
    if (!viewer) {
      set.status = 404;
      return { error: 'User not found' };
    }
    const rooms = await listDmRooms(viewer.uuid);
    return { dms: await summariseRooms(rooms, viewer.uuid) };
  })
  .post(
    '/dm/start',
    async ({ body, authUser, set }) => {
      const viewer = await getUserByUUID(authUser?.uuid as string);
      if (!viewer) {
        set.status = 404;
        return { error: 'User not found' };
      }

      const result = await getOrCreateDmRoomByUsername(viewer, body.username);
      if (!result.ok) {
        set.status = result.status;
        return { error: result.error };
      }

      const [summary] = await summariseRooms([result.room], viewer.uuid);
      return { dm: summary, created: result.created, room: roomToDoc(result.room) };
    },
    { body: t.Object({ username: t.String() }) }
  );

export default dms;
