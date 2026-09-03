import { Elysia } from 'elysia';
import { getUserByUUID, updateUser } from '../../db';
import { deriveAuth, onlyActive } from '../../middleware';
import { getSailorHireCost, SAILOR_MAX_LEVEL } from '../../../common/fishing/fishing';

export const hireSailor = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post('/sailors/hire', async ({ authUser, set }) => {
    const fetchedUser = await getUserByUUID(authUser?.uuid as string);
    if (!fetchedUser) {
      set.status = 404;
      return { error: 'User not found' };
    }

    fetchedUser.fishing ??= {
      aquarium: { capacity: 10, level: 1, fish: [] },
      bait_owned: {},
      fish_caught: {},
      rods_owned: [],
    };
    fetchedUser.fishing.sailors ??= { levels: [], last_collected_at: Date.now() };

    const levels = fetchedUser.fishing.sailors.levels;
    if (levels.length >= SAILOR_MAX_LEVEL) {
      set.status = 400;
      return { error: `You cannot hire more than ${SAILOR_MAX_LEVEL} sailors.` };
    }

    const cost = getSailorHireCost(levels.length);
    if (fetchedUser.money < cost) {
      set.status = 400;
      return { error: 'Insufficient funds' };
    }

    fetchedUser.money -= cost;
    levels.push(1);

    await updateUser(fetchedUser);
    return {
      message: 'Sailor hired successfully',
      money: fetchedUser.money,
      sailors: fetchedUser.fishing.sailors,
    };
  });

export default hireSailor;