import { Elysia } from 'elysia';
import { getAppealsByUserUUID, getUserByUUID } from '../../db';
import { deriveAuth, onlyAuth } from '../../middleware';

export const myAppeals = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyAuth)
  .get('/my-appeals', async ({ authUser, set }) => {
    const user = authUser;
    const user_uuid: string | undefined = user?.uuid;
    const fetchedUser = await getUserByUUID(user_uuid as string);

    if (!fetchedUser) {
      set.status = 404;
      return { error: 'User not found' };
    }

    const appeals = await getAppealsByUserUUID(fetchedUser.uuid);

    return { appeals };
  });

export default myAppeals;
