import { Elysia } from 'elysia';
import { getAllRooms, getUserByUUID } from '../../db';
import { deriveAuth, onlyActive } from '../../middleware';
import { roomToDoc } from '../../../common/models/room';

export const listRooms = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .get('/rooms', async ({ authUser, set }) => {
    const user = authUser;
    const user_uuid: string | undefined = user?.uuid;
    const fetchedUser = await getUserByUUID(user_uuid as string);

    if (!fetchedUser) {
      set.status = 404;
      return { error: 'User not found' };
    }

    const rooms = await getAllRooms();

    // Filter the rooms:
    // - Public rooms are visible to everyone
    // - Staff rooms are visible only to users with role != 'user'
    // - Private rooms are visible only to members
    const filteredRooms = rooms.filter(r => {
      if (r.type === 'public') return true;
      if (r.type === 'staff' && fetchedUser.role !== 'user') return true;
      if (r.type === 'private' && r.members?.includes(user_uuid as string)) return true;
      return false;
    });

    return { rooms: filteredRooms.map(r => roomToDoc(r)) };
  });

export default listRooms;
