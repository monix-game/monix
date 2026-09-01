import { Elysia, t } from 'elysia';
import { getUserByUUID, updateUser } from '../../db';
import { deriveAuth, onlyActive } from '../../middleware';
import { fishingRods } from '../../../common/fishing/fishingRods';

export const buyRod = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post(
    '/buy/rod',
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

      if (fetchedUser.money < rod.price) {
        set.status = 400;
        return { error: 'Insufficient funds' };
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
      if (fetchedUser.fishing.rods_owned.includes(rod_id)) {
        set.status = 400;
        return { error: 'You already own this rod' };
      }

      // Deduct money and add rod to user's owned rods
      fetchedUser.money -= rod.price;
      fetchedUser.fishing.rods_owned.push(rod_id);

      await updateUser(fetchedUser);

      return {
        message: 'Rod purchased successfully',
        money: fetchedUser.money,
        rods_owned: fetchedUser.fishing.rods_owned,
      };
    },
    {
      body: t.Object({ rod_id: t.Optional(t.String()) }),
    }
  );

export default buyRod;
