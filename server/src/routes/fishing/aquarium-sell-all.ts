import { Elysia } from 'elysia';
import { mutateUserAndSave } from '../../db';
import { deriveAuth, onlyActive } from '../../middleware';
import { DEFAULT_USER_STATS } from '../../../common/models/user';
import { getFishValue, getCurrentFishingEvent, applyAquariumEventModifiers } from '../../../common/fishing/fishing';

type SellAllOutcome = { ok: 'success'; message: string; money: number; soldFor: number };

export const sellAllFish = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post('/aquarium/sell/all', async ({ authUser, set }) => {
    const user_uuid = authUser?.uuid as string;

    const result = await mutateUserAndSave<SellAllOutcome>(
      user_uuid,
      async fetchedUser => {
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

        fetchedUser.stats ??= DEFAULT_USER_STATS;
        fetchedUser.stats.fish_sold = (fetchedUser.stats.fish_sold || 0) + fishToSell.length;

        return {
          changed: true,
          value: {
            ok: 'success' as const,
            message: 'All fish sold successfully',
            money: fetchedUser.money,
            soldFor: totalValue,
          },
        };
      }
    );

    if (!result) {
      set.status = 404;
      return { error: 'User not found' };
    }
    return result;
  });

export default sellAllFish;
