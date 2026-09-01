import { Elysia } from 'elysia';
import { updateUser } from '../../db';
import { userToDoc } from '../../../common/models/user';
import { deriveAuth, onlyAuth } from '../../middleware';
import { getCurrentFishingEvent, applyAquariumEventModifiers } from '../../../common/fishing/fishing';

export const getUser = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyAuth)
  .get('/user', ({ authUser, set }) => {
    const user = authUser;

    if (!user) {
      set.status = 404;
      return { error: 'User not found' };
    }

    const currentEvent = getCurrentFishingEvent();
    const aquariumFish = user.fishing?.aquarium?.fish ?? [];
    if (applyAquariumEventModifiers(aquariumFish, currentEvent)) {
      void updateUser(user);
    }

    return { user: userToDoc(user) };
  });

export default getUser;
