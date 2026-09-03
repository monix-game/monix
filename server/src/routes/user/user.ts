import { Elysia } from 'elysia';
import { getPetsByOwnerUUID, getUserByUUID, updateUser } from '../../db';
import { userToClient } from '../../../common/models/user';
import { deriveAuth, onlyAuth } from '../../middleware';
import { getPendingSailorEarnings } from '../../helpers/sailors';
import { unlockEligibleAchievements } from '../../../common/achievements';

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
    const achievements = unlockEligibleAchievements(
      { ...fresh, petsOwned: pets.length },
      fresh.achievements
    );
    if (achievements.length !== (fresh.achievements || []).length) {
      fresh.achievements = achievements;
      await updateUser(fresh);
    }

    return { user: userToClient(fresh) };
  });

export default getUser;
