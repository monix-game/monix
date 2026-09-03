import { Elysia } from 'elysia';
import { mutateUserAndSave } from '../../db';
import { deriveAuth, onlyActive } from '../../middleware';
import { getSailorHireCost, SAILOR_MAX_LEVEL } from '../../../common/fishing/sailors';
import { accrueSailorEarnings } from '../../helpers/sailors';

type HireOutcome =
  | { ok: 'error'; status: number; error: string }
  | {
      ok: 'success';
      message: string;
      money: number;
      sailors: { levels: number[]; last_collected_at?: number };
    };

export const hireSailor = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post('/sailors/hire', async ({ authUser, set }) => {
    const user_uuid = authUser?.uuid as string;

    const result = await mutateUserAndSave<HireOutcome>(user_uuid, async fetchedUser => {
      fetchedUser.fishing ??= {
        aquarium: { capacity: 10, level: 1, fish: [] },
        bait_owned: {},
        fish_caught: {},
        rods_owned: [],
      };
      fetchedUser.fishing.sailors ??= { levels: [], last_collected_at: Date.now() };
      accrueSailorEarnings(fetchedUser);

      const levels = fetchedUser.fishing.sailors.levels;
      if (levels.length >= SAILOR_MAX_LEVEL) {
        return {
          changed: false,
          value: {
            ok: 'error',
            status: 400,
            error: `You cannot hire more than ${SAILOR_MAX_LEVEL} sailors.`,
          },
        };
      }

      const cost = getSailorHireCost(levels.length);
      if (fetchedUser.money < cost) {
        return { changed: false, value: { ok: 'error', status: 400, error: 'Insufficient funds' } };
      }

      fetchedUser.money -= cost;
      levels.push(1);

      return {
        changed: true,
        value: {
          ok: 'success' as const,
          message: 'Sailor hired successfully',
          money: fetchedUser.money,
          sailors: fetchedUser.fishing.sailors,
        },
      };
    });

    if (!result) {
      set.status = 404;
      return { error: 'User not found' };
    }
    if (result.ok === 'error') {
      set.status = result.status;
      return { error: result.error };
    }
    return result;
  });

export default hireSailor;
