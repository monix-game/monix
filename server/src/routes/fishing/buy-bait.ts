import { Elysia, t } from 'elysia';
import { getUserByUUID, updateUser } from '../../db';
import { deriveAuth, onlyActive } from '../../middleware';
import { fishingBaits } from '../../../common/fishing/fishingBait';

export const buyBait = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post(
    '/buy/bait',
    async ({ body, authUser, set }) => {
      const user = authUser;
      const user_uuid: string | undefined = user?.uuid;
      const fetchedUser = await getUserByUUID(user_uuid as string);

      if (!fetchedUser) {
        set.status = 404;
        return { error: 'User not found' };
      }

      const { bait_id, quantity } = body as { bait_id: string; quantity: number };

      if (!bait_id) {
        set.status = 400;
        return { error: 'bait_id is required' };
      }

      if (typeof bait_id !== 'string') {
        set.status = 400;
        return { error: 'bait_id must be a string' };
      }

      if (!quantity || typeof quantity !== 'number' || quantity <= 0) {
        set.status = 400;
        return { error: 'quantity must be a positive number' };
      }

      // Initialize fishing data if not present
      fetchedUser.fishing ??= {
        aquarium: { capacity: 10, level: 1, fish: [] },
        bait_owned: {},
        fish_caught: {},
        rods_owned: [],
      };

      fetchedUser.fishing.bait_owned ??= {};

      const bait = fishingBaits.find(b => b.id === bait_id);

      if (!bait) {
        set.status = 400;
        return { error: 'Invalid bait_id' };
      }

      const totalPrice = bait.price * quantity;

      if (fetchedUser.money < totalPrice) {
        set.status = 400;
        return { error: 'Insufficient funds' };
      }

      // Deduct money and add bait to user's owned bait
      fetchedUser.money -= totalPrice;
      fetchedUser.fishing.bait_owned[bait_id] = (fetchedUser.fishing.bait_owned[bait_id] || 0) + quantity;

      await updateUser(fetchedUser);

      return {
        message: 'Bait purchased successfully',
        money: fetchedUser.money,
        bait_owned: fetchedUser.fishing.bait_owned,
      };
    },
    {
      body: t.Object({
        bait_id: t.Optional(t.String()),
        quantity: t.Optional(t.Number()),
      }),
    }
  );

export default buyBait;
