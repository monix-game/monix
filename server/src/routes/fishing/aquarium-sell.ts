import { Elysia, t } from 'elysia';
import { mutateUserAndSave } from '../../db';
import { deriveAuth, onlyActive } from '../../middleware';
import { DEFAULT_USER_STATS } from '../../../common/models/user';
import { getFishValue, getCurrentFishingEvent, applyAquariumEventModifiers } from '../../../common/fishing/fishing';

type SellFishOutcome =
  | { ok: 'error'; status: number; error: string }
  | { ok: 'success'; message: string; money: number; soldFor: number };

export const sellFish = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post(
    '/aquarium/sell',
    async ({ body, authUser, set }) => {
      const user_uuid = authUser?.uuid as string;
      const { fish_id } = body as { fish_id: string };

      if (!fish_id || typeof fish_id !== 'string') {
        set.status = 400;
        return { error: 'fish_id is required and must be a string' };
      }

      const result = await mutateUserAndSave<SellFishOutcome>(
        user_uuid,
        async fetchedUser => {
          // Initialize fishing data if not present
          fetchedUser.fishing ??= {
            aquarium: { capacity: 10, level: 1, fish: [] },
            bait_owned: {},
            fish_caught: {},
            rods_owned: [],
          };

          const fishIndex = fetchedUser.fishing.aquarium.fish.findIndex(
            f => f.uuid === fish_id
          );
          if (fishIndex === -1) {
            return { changed: false, value: { ok: 'error', status: 400, error: 'Fish not found in aquarium' } };
          }

          const currentEvent = getCurrentFishingEvent();
          applyAquariumEventModifiers(fetchedUser.fishing.aquarium.fish, currentEvent);

          const fish = fetchedUser.fishing.aquarium.fish[fishIndex];
          const value = getFishValue(fish);

          // Remove fish from aquarium and add money to user
          fetchedUser.fishing.aquarium.fish.splice(fishIndex, 1);
          fetchedUser.money += value;

          fetchedUser.stats ??= DEFAULT_USER_STATS;
          fetchedUser.stats.fish_sold = (fetchedUser.stats.fish_sold || 0) + 1;

          return {
            changed: true,
            value: {
              ok: 'success',
              message: 'Fish sold successfully',
              money: fetchedUser.money,
              soldFor: value,
            },
          };
        }
      );

      if (!result) {
        set.status = 404;
        return { error: 'User not found' };
      }
      if (result.ok === 'error') {
        set.status = result.status;
        return { error: result.error };
      }
      return result;
    },
    {
      body: t.Object({ fish_id: t.Optional(t.String()) }),
    }
  );

export default sellFish;
