import { Elysia } from 'elysia';
import { getUserByUUID } from '../../db';
import { deriveAuth, onlyActive } from '../../middleware';

export const aquarium = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .get('/aquarium', async ({ authUser, set }) => {
    const user = authUser;
    const user_uuid: string | undefined = user?.uuid;
    const fetchedUser = await getUserByUUID(user_uuid as string);

    if (!fetchedUser) {
      set.status = 404;
      return { error: 'User not found' };
    }

    const aquarium = fetchedUser.fishing?.aquarium || { capacity: 10, level: 1, fish: [] };

    return { aquarium };
  });

export default aquarium;
