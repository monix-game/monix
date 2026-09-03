import { Elysia } from 'elysia';
import { updateUser } from '../../db';
import { userToClient } from '../../../common/models/user';
import { deriveAuth, onlyAuth } from '../../middleware';
import { getCurrentFishingEvent, applyAquariumEventModifiers } from '../../../common/fishing/fishing';
import { applySailorEarnings } from '../../helpers/sailors';

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

    const moneyBefore = user.money;
    const earned = applySailorEarnings(user);
    if (earned > 0 || user.money !== moneyBefore) {
      void updateUser(user);
    }

    return { user: userToClient(user) };
  });

export default getUser;
