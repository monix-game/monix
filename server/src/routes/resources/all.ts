import { Elysia } from 'elysia';
import { getUserByUUID } from '../../db';
import { deriveAuth, onlyActive } from '../../middleware';
import { resources } from '../../../common/resources';

export const allResources = new Elysia()
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

    const userResources: { [key: string]: number } = {};

    for (const resource of resources) {
      userResources[resource.id] = 0;
    }

    if (fetchedUser.resources) {
      for (const resourceId of Object.keys(fetchedUser.resources)) {
        userResources[resourceId] = fetchedUser.resources[resourceId];
      }
    }

    return { resources: userResources };
  });

export default allResources;
