import { Elysia } from 'elysia';
import { getUserByUUID } from '../../db';
import { deriveAuth, onlyActive } from '../../middleware';
import { buildRooms } from '../../helpers/snapshots';

export const listRooms = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .get('/rooms', async ({ authUser, set }) => {
    const fetchedUser = await getUserByUUID(authUser?.uuid as string);

    if (!fetchedUser) {
      set.status = 404;
      return { error: 'User not found' };
    }

    return buildRooms(fetchedUser);
  });

export default listRooms;
