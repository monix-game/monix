import { Elysia, t } from 'elysia';
import { getUserByUUID, updateUser } from '../../db';
import { deriveAuth, onlyActive } from '../../middleware';
import {
  clampSailorLevel,
  getSailorLevelUpCost,
  SAILOR_MAX_LEVEL,
} from '../../../common/fishing/fishing';

export const levelUpSailor = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post(
    '/sailors/levelup',
    async ({ body, authUser, set }) => {
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
      const sailorIndex = Number(body.sailor_index);
      if (!Number.isInteger(sailorIndex) || sailorIndex < 0 || sailorIndex >= levels.length) {
        set.status = 400;
        return { error: 'Invalid sailor index' };
      }

      const currentLevel = clampSailorLevel(levels[sailorIndex]);
      if (currentLevel >= SAILOR_MAX_LEVEL) {
        set.status = 400;
        return { error: `Sailor is already at max level ${SAILOR_MAX_LEVEL}.` };
      }

      const cost = getSailorLevelUpCost(currentLevel);
      if (fetchedUser.money < cost) {
        set.status = 400;
        return { error: 'Insufficient funds' };
      }

      fetchedUser.money -= cost;
      levels[sailorIndex] = currentLevel + 1;

      await updateUser(fetchedUser);
      return {
        message: 'Sailor leveled up successfully',
        money: fetchedUser.money,
        sailor_level: levels[sailorIndex],
        sailors: fetchedUser.fishing.sailors,
      };
    },
    { body: t.Object({ sailor_index: t.Optional(t.Number()) }) }
  );

export default levelUpSailor;