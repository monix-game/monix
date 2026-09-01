import { Elysia } from 'elysia';
import { getUserByUUID, updateUser } from '../../db';
import { deriveAuth, onlyActive } from '../../middleware';
import { getFishValue, getCurrentFishingEvent, applyAquariumEventModifiers } from '../../../common/fishing/fishing';

export const sellAllFish = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post('/aquarium/sell/all', async ({ authUser, set }) => {
    const user = authUser;
    const user_uuid: string | undefined = user?.uuid;
    const fetchedUser = await getUserByUUID(user_uuid as string);

    if (!fetchedUser) {
      set.status = 404;
      return { error: 'User not found' };
    }

    // Initialize fishing data if not present
    fetchedUser.fishing ??= {
      aquarium: { capacity: 10, level: 1, fish: [] },
      bait_owned: {},
      fish_caught: {},
      rods_owned: [],
    };

    const fishToSell = fetchedUser.fishing.aquarium.fish;
    let totalValue = 0;

    const currentEvent = getCurrentFishingEvent();
    applyAquariumEventModifiers(fishToSell, currentEvent);
    for (const fish of fishToSell) {
      totalValue += getFishValue(fish);
    }

    // Clear aquarium and add money to user
    fetchedUser.fishing.aquarium.fish = [];
    fetchedUser.money += totalValue;

    await updateUser(fetchedUser);

    return {
      message: 'All fish sold successfully',
      money: fetchedUser.money,
      soldFor: totalValue,
    };
  });

export default sellAllFish;
