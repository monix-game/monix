import { Elysia } from 'elysia';
import { getUserByUUID } from '../../db';
import { deriveAuth, onlyActive } from '../../middleware';
import { buildPets } from '../../helpers/snapshots';

export const allPets = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .get('/all', async ({ authUser, set }) => {
    const user = authUser;
    const user_uuid: string | undefined = user?.uuid;
    const fetchedUser = await getUserByUUID(user_uuid as string);

    if (!fetchedUser) {
      set.status = 404;
      return { error: 'User not found' };
    }

    const sortedPets = await buildPets(user_uuid as string);

    return {
      message: 'Pets retrieved successfully',
      pets: sortedPets,
    };
  });

export default allPets;