import { Elysia, t } from 'elysia';
import { getUserByUUID, updateUser } from '../../db';
import { deriveAuth, onlyActive } from '../../middleware';
import { fishingRods } from '../../../common/fishing/fishingRods';

export const sellRod = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post(
    '/sell/rod',
    async ({ body, authUser, set }) => {
      const user = authUser;
      const user_uuid: string | undefined = user?.uuid;
      const fetchedUser = await getUserByUUID(user_uuid as string);

      if (!fetchedUser) {
        set.status = 404;
        return { error: 'User not found' };
      }

      const { rod_id } = body as { rod_id: string };

      if (!rod_id) {
        set.status = 400;
        return { error: 'rod_id is required' };
      }

      if (typeof rod_id !== 'string') {
        set.status = 400;
        return { error: 'rod_id must be a string' };
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

      // Initialize fishing data if not present
      fetchedUser.fishing ??= {
        aquarium: { capacity: 10, level: 1, fish: [] },
        bait_owned: {},
        fish_caught: {},
        rods_owned: [],
      };

      fetchedUser.fishing.rods_owned ??= [];

      // Check if user owns the rod
      if (!fetchedUser.fishing.rods_owned.includes(rod_id)) {
        set.status = 400;
        return { error: 'You do not own this rod' };
      }

      // Don't allow selling your last rod
      if (fetchedUser.fishing.rods_owned.length <= 1) {
        set.status = 400;
        return { error: 'You must keep at least one rod' };
      }

      // Unequip the rod if it's currently equipped
      if (fetchedUser.fishing.equipped_rod === rod_id) {
        fetchedUser.fishing.equipped_rod = undefined;
      }

      const sellPrice = Math.floor(rod.price * 0.5);

      // Remove the rod and refund half of its original value
      fetchedUser.fishing.rods_owned = fetchedUser.fishing.rods_owned.filter(id => id !== rod_id);
      fetchedUser.money += sellPrice;

      await updateUser(fetchedUser);

      return {
        message: 'Rod sold successfully',
        money: fetchedUser.money,
        sold_for: sellPrice,
        rods_owned: fetchedUser.fishing.rods_owned,
      };
    },
    {
      body: t.Object({ rod_id: t.Optional(t.String()) }),
    }
  );

export default sellRod;
