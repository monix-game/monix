import { Elysia } from 'elysia';
import { mutateUserAndSave } from '../../db';
import { deriveAuth, onlyActive } from '../../middleware';
import { accrueSailorEarnings } from '../../helpers/sailors';

type CollectOutcome =
  | { ok: 'error'; status: number; error: string }
  | {
      ok: 'success';
      message: string;
      money: number;
      earned: number;
      sailors: { levels: number[]; last_collected_at?: number; pending_coins?: number };
    };

export const collectSailorEarnings = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post('/sailors/collect', async ({ authUser, set }) => {
    const result = await mutateUserAndSave<CollectOutcome>(authUser?.uuid as string, async user => {
      const sailors = user.fishing?.sailors;
      if (!sailors || !Array.isArray(sailors.levels) || sailors.levels.length === 0) {
        return {
          changed: false,
          value: { ok: 'error' as const, status: 400, error: 'You have no sailors.' },
        };
      }

      const now = Date.now();
      const earned = accrueSailorEarnings(user, now);
      sailors.pending_coins = 0;
      user.money = (user.money || 0) + earned;

      return {
        changed: true,
        value: {
          ok: 'success' as const,
          message: 'Sailor earnings collected.',
          money: user.money,
          earned,
          sailors,
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

export default collectSailorEarnings;
