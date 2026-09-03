import { Elysia, t } from 'elysia';
import { mutateUserAndSave } from '../../db';
import { deriveAuth, onlyActive } from '../../middleware';
import { fishingRods } from '../../../common/fishing/fishingRods';

type SellRodOutcome =
  | { ok: 'error'; status: number; error: string }
  | { ok: 'success'; message: string; money: number; sold_for: number; rods_owned: string[] };

export const sellRod = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post(
    '/sell/rod',
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
      if (!rod.buyable || rod.price <= 0) {
        set.status = 400;
        return { error: 'This rod cannot be sold' };
      }

      const rodId = rod_id;
      const sellPrice = Math.floor(rod.price * 0.5);

      const result = await mutateUserAndSave<SellRodOutcome>(
        user_uuid,
        async fetchedUser => {
          // Initialize fishing data if not present
          fetchedUser.fishing ??= {
            aquarium: { capacity: 10, level: 1, fish: [] },
            bait_owned: {},
            fish_caught: {},
            rods_owned: [],
          };
          fetchedUser.fishing.rods_owned ??= [];

          // Check if user owns the rod
          if (!fetchedUser.fishing.rods_owned.includes(rodId)) {
            return { changed: false, value: { ok: 'error', status: 400, error: 'You do not own this rod' } };
          }

          // Don't allow selling your last rod
          if (fetchedUser.fishing.rods_owned.length <= 1) {
            return { changed: false, value: { ok: 'error', status: 400, error: 'You must keep at least one rod' } };
          }

          // Unequip the rod if it's currently equipped
          if (fetchedUser.fishing.equipped_rod === rodId) {
            fetchedUser.fishing.equipped_rod = undefined;
          }

          // Remove the rod and refund half of its original value
          fetchedUser.fishing.rods_owned = fetchedUser.fishing.rods_owned.filter(id => id !== rodId);
          fetchedUser.money += sellPrice;

          return {
            changed: true,
            value: {
              ok: 'success' as const,
              message: 'Rod sold successfully',
              money: fetchedUser.money,
              sold_for: sellPrice,
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

export default sellRod;
