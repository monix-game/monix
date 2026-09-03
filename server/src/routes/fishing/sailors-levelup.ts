import { Elysia, t } from 'elysia';
import { mutateUserAndSave } from '../../db';
import { deriveAuth, onlyActive } from '../../middleware';
import {
  clampSailorLevel,
  getSailorLevelUpCost,
  SAILOR_MAX_LEVEL,
} from '../../../common/fishing/fishing';

type LevelUpOutcome =
  | { ok: 'error'; status: number; error: string }
  | {
      ok: 'success';
      message: string;
      money: number;
      sailor_level: number;
      sailors: { levels: number[]; last_collected_at?: number };
    };

export const levelUpSailor = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post(
    '/sailors/levelup',
    async ({ body, authUser, set }) => {
      const user_uuid = authUser?.uuid as string;
      const sailorIndex = Number(body.sailor_index);
      if (!Number.isInteger(sailorIndex) || sailorIndex < 0) {
        set.status = 400;
        return { error: 'Invalid sailor index' };
      }

      const result = await mutateUserAndSave<LevelUpOutcome>(
        user_uuid,
        async fetchedUser => {
          fetchedUser.fishing ??= {
            aquarium: { capacity: 10, level: 1, fish: [] },
            bait_owned: {},
            fish_caught: {},
            rods_owned: [],
          };
          fetchedUser.fishing.sailors ??= { levels: [], last_collected_at: Date.now() };

          const levels = fetchedUser.fishing.sailors.levels;
          if (sailorIndex >= levels.length) {
            return { changed: false, value: { ok: 'error', status: 400, error: 'Invalid sailor index' } };
          }

          const currentLevel = clampSailorLevel(levels[sailorIndex]);
          if (currentLevel >= SAILOR_MAX_LEVEL) {
            return { changed: false, value: { ok: 'error', status: 400, error: `Sailor is already at max level ${SAILOR_MAX_LEVEL}.` } };
          }

          const cost = getSailorLevelUpCost(currentLevel);
          if (fetchedUser.money < cost) {
            return { changed: false, value: { ok: 'error', status: 400, error: 'Insufficient funds' } };
          }

          fetchedUser.money -= cost;
          levels[sailorIndex] = currentLevel + 1;

          return {
            changed: true,
            value: {
              ok: 'success' as const,
              message: 'Sailor leveled up successfully',
              money: fetchedUser.money,
              sailor_level: levels[sailorIndex],
              sailors: fetchedUser.fishing.sailors,
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
    { body: t.Object({ sailor_index: t.Optional(t.Number()) }) }
  );

export default levelUpSailor;