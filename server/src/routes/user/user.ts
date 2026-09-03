import { Elysia } from 'elysia';
import { mutateUserAndSave } from '../../db';
import { userToClient } from '../../../common/models/user';
import { deriveAuth, onlyAuth } from '../../middleware';
import { getCurrentFishingEvent, applyAquariumEventModifiers } from '../../../common/fishing/fishing';
import { applySailorEarnings } from '../../helpers/sailors';

export const getUser = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyAuth)
  .get('/user', async ({ authUser, set }) => {
    const user = authUser;

    if (!user) {
      set.status = 404;
      return { error: 'User not found' };
    }

    const currentEvent = getCurrentFishingEvent();

    const fresh = await mutateUserAndSave(user.uuid, async freshUser => {
      let changed = false;

      const aquariumFish = freshUser.fishing?.aquarium?.fish ?? [];
      if (applyAquariumEventModifiers(aquariumFish, currentEvent)) {
        changed = true;
      }

      const moneyBefore = freshUser.money;
      const earned = applySailorEarnings(freshUser);
      if (earned > 0 || freshUser.money !== moneyBefore) {
        changed = true;
      }

      return { changed, value: freshUser };
    });

    if (!fresh) {
      set.status = 404;
      return { error: 'User not found' };
    }

    return { user: userToClient(fresh) };
  });

export default getUser;
