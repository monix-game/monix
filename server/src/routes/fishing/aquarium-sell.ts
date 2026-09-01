import { Elysia, t } from 'elysia';
import { getUserByUUID, updateUser } from '../../db';
import { deriveAuth, onlyActive } from '../../middleware';
import { getFishValue, getCurrentFishingEvent, applyAquariumEventModifiers } from '../../../common/fishing/fishing';

export const sellFish = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post(
    '/aquarium/sell',
    async ({ body, authUser, set }) => {
      const user = authUser;
      const user_uuid: string | undefined = user?.uuid;
      const fetchedUser = await getUserByUUID(user_uuid as string);

      if (!fetchedUser) {
        set.status = 404;
        return { error: 'User not found' };
      }

      const { fish_id } = body as { fish_id: string };

      if (!fish_id) {
        set.status = 400;
        return { error: 'fish_id is required' };
      }

      if (typeof fish_id !== 'string') {
        set.status = 400;
        return { error: 'fish_id must be a string' };
      }

      const fishIndex = fetchedUser.fishing?.aquarium.fish.findIndex(f => f.uuid === fish_id);

      if (fishIndex === undefined || fishIndex === -1) {
        set.status = 400;
        return { error: 'Fish not found in aquarium' };
      }

      // Initialize fishing data if not present
      fetchedUser.fishing ??= {
        aquarium: { capacity: 10, level: 1, fish: [] },
        bait_owned: {},
        fish_caught: {},
        rods_owned: [],
      };

      const currentEvent = getCurrentFishingEvent();
      applyAquariumEventModifiers(fetchedUser.fishing.aquarium.fish, currentEvent);

      const fish = fetchedUser.fishing.aquarium.fish[fishIndex];
      const value = getFishValue(fish);

      // Remove fish from aquarium and add money to user
      fetchedUser.fishing.aquarium.fish.splice(fishIndex, 1);
      fetchedUser.money += value;

      await updateUser(fetchedUser);

      return {
        message: 'Fish sold successfully',
        money: fetchedUser.money,
        soldFor: value,
      };
    },
    {
      body: t.Object({ fish_id: t.Optional(t.String()) }),
    }
  );

export default sellFish;
