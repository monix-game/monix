import { Elysia, t } from 'elysia';
import { mutateUserAndSave } from '../../db';
import { deriveAuth, onlyActive } from '../../middleware';
import { fishingBaits } from '../../../common/fishing/fishingBait';

type BuyBaitOutcome =
  | { ok: 'error'; status: number; error: string }
  | { ok: 'success'; message: string; money: number; bait_owned: Record<string, number> };

export const buyBait = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post(
    '/buy/bait',
    async ({ body, authUser, set }) => {
      const user_uuid = authUser?.uuid as string;
      const { bait_id, quantity } = body as { bait_id: string; quantity: number };

      if (!bait_id || typeof bait_id !== 'string') {
        set.status = 400;
        return { error: 'bait_id is required and must be a string' };
      }
      if (!quantity || typeof quantity !== 'number' || quantity <= 0) {
        set.status = 400;
        return { error: 'quantity must be a positive number' };
      }

      const bait = fishingBaits.find(b => b.id === bait_id);
      if (!bait) {
        set.status = 400;
        return { error: 'Invalid bait_id' };
      }

      const totalPrice = bait.price * quantity;

      const result = await mutateUserAndSave<BuyBaitOutcome>(
        user_uuid,
        async fetchedUser => {
          // Initialize fishing data if not present
          fetchedUser.fishing ??= {
            aquarium: { capacity: 10, level: 1, fish: [] },
            bait_owned: {},
            fish_caught: {},
            rods_owned: [],
          };
          fetchedUser.fishing.bait_owned ??= {};

          if (fetchedUser.money < totalPrice) {
            return { changed: false, value: { ok: 'error', status: 400, error: 'Insufficient funds' } };
          }

          // Deduct money and add bait to user's owned bait
          fetchedUser.money -= totalPrice;
          fetchedUser.fishing.bait_owned[bait_id] =
            (fetchedUser.fishing.bait_owned[bait_id] || 0) + quantity;

          return {
            changed: true,
            value: {
              ok: 'success' as const,
              message: 'Bait purchased successfully',
              money: fetchedUser.money,
              bait_owned: fetchedUser.fishing.bait_owned,
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
      body: t.Object({
        bait_id: t.Optional(t.String()),
        quantity: t.Optional(t.Number()),
      }),
    }
  );

export default buyBait;
