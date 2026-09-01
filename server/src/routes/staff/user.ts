import { Elysia } from 'elysia';
import { getUserByUUID } from '../../db';
import { deriveAuth, onlyRole } from '../../middleware';

export const getUser = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyRole('helper'))
  .get('/user/:uuid', async ({ params, set }) => {
    const { uuid } = params;

    if (!uuid) {
      set.status = 400;
      return { error: 'Missing uuid parameter' };
    }

    const user = await getUserByUUID(uuid);

    if (!user) {
      set.status = 404;
      return { error: 'User not found' };
    }

    return { user };
  });

export default getUser;
