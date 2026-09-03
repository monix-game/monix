import { Elysia, t } from 'elysia';
import { mutateUserAndSave } from '../../db';
import { deriveAuth, onlyActive } from '../../middleware';
import { fishingRods } from '../../../common/fishing/fishingRods';

type BuyRodOutcome =
  | { ok: 'error'; status: number; error: string }
  | { ok: 'success'; message: string; money: number; rods_owned: string[] };

export const buyRod = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post(
    '/buy/rod',
    async ({ body, authUser, set }) => {
      const user_uuid = authUser?.uuid as string;
      const { rod_id } = body as { rod_id: string };

      if (!rod_id || typeof rod_id !== 'string') {
        set.status = 400;
        return { error: 'rod_id is required and must be a string' };
      }

      const rod = fishingRods.find(r => r.id === rod_id);
      if (!rod) {
        set.status = 400;
        return { error: 'Invalid rod_id' };
      }

      const rodId = rod_id;
      const rodPrice = rod.price;

      const result = await mutateUserAndSave<BuyRodOutcome>(
        user_uuid,
        async fetchedUser => {
          if (fetchedUser.money < rodPrice) {
            return { changed: false, value: { ok: 'error', status: 400, error: 'Insufficient funds' } };
          }

          // Initialize fishing data if not present
          fetchedUser.fishing ??= {
            aquarium: { capacity: 10, level: 1, fish: [] },
            bait_owned: {},
            fish_caught: {},
            rods_owned: [],
          };
          fetchedUser.fishing.rods_owned ??= [];

          // Check if user already owns the rod
          if (fetchedUser.fishing.rods_owned.includes(rodId)) {
            return { changed: false, value: { ok: 'error', status: 400, error: 'You already own this rod' } };
          }

          // Deduct money and add rod to user's owned rods
          fetchedUser.money -= rodPrice;
          fetchedUser.fishing.rods_owned.push(rodId);

          return {
            changed: true,
            value: {
              ok: 'success' as const,
              message: 'Rod purchased successfully',
              money: fetchedUser.money,
              rods_owned: fetchedUser.fishing.rods_owned,
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
      body: t.Object({ rod_id: t.Optional(t.String()) }),
    }
  );

export default buyRod;
