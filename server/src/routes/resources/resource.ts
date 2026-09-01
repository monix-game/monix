import { Elysia } from 'elysia';
import { getUserByUUID } from '../../db';
import { deriveAuth, onlyActive } from '../../middleware';

export const getResource = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .get('/:resourceId', async ({ params, authUser, set }) => {
    const user = authUser;
    const user_uuid: string | undefined = user?.uuid;
    const resourceId = params.resourceId;
    const fetchedUser = await getUserByUUID(user_uuid as string);

    if (!fetchedUser) {
      set.status = 404;
      return { error: 'User not found' };
    }

    const quantity = fetchedUser.resources ? fetchedUser.resources[resourceId] || 0 : 0;

    return { resourceId, quantity };
  });

export default getResource;
