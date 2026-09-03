import { Elysia } from 'elysia';
import { getPetsByOwnerUUID, getUserByUUID, updateUser } from '../../db';
import { userToClient } from '../../../common/models/user';
import { deriveAuth, onlyAuth } from '../../middleware';
import { getPendingSailorEarnings } from '../../helpers/sailors';
import { getEligibleAchievementIds } from '../../../common/achievements';

export const getUser = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyAuth)
  .get('/user', async ({ authUser, set }) => {
    const user = authUser;

    if (!user) {
      set.status = 404;
      return { error: 'User not found' };
    }

    const fresh = await getUserByUUID(user.uuid);

    if (!fresh) {
      set.status = 404;
      return { error: 'User not found' };
    }

    if (fresh.fishing?.sailors) {
      fresh.fishing.sailors.pending_coins = getPendingSailorEarnings(fresh);
    }

    const pets = await getPetsByOwnerUUID(fresh.uuid);
    const eligible = getEligibleAchievementIds({ ...fresh, petsOwned: pets.length });
    const earned = new Set(fresh.achievements || []);
    const newlyEarned = eligible.filter(id => !earned.has(id));
    if (newlyEarned.length > 0) {
      fresh.achievements = [...earned, ...newlyEarned];
      await updateUser(fresh);
    }

    return { user: userToClient(fresh) };
  });

export default getUser;
