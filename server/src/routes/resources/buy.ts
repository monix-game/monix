import { Elysia, t } from 'elysia';
import { getUserByUUID, updateUser } from '../../db';
import { deriveAuth, onlyActive } from '../../middleware';
import { generatePrice } from '../../helpers/market';

export const buyResource = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post(
    '/:resourceId/buy',
    async ({ params, body, authUser, set }) => {
      const user = authUser;
      const user_uuid: string | undefined = user?.uuid;
      const resourceId = params.resourceId;
      const fetchedUser = await getUserByUUID(user_uuid as string);

      if (!fetchedUser) {
        set.status = 404;
        return { error: 'User not found' };
      }

      const resourcePrice = generatePrice(resourceId, Math.floor(Date.now() / 1000));
      const quantityToBuy: number = Number((body as { quantity?: unknown }).quantity || 0);

      if (Number.isNaN(quantityToBuy) || quantityToBuy <= 0) {
        set.status = 400;
        return { error: 'Invalid quantity' };
      }

      const totalCost = resourcePrice * quantityToBuy;

      if (fetchedUser.money === undefined || fetchedUser.money < totalCost) {
        set.status = 400;
        return { error: 'Insufficient balance' };
      }

      // Deduct balance and add resources
      fetchedUser.money -= totalCost;
      if (!fetchedUser.resources) {
        fetchedUser.resources = {};
      }

      fetchedUser.resources[resourceId] =
        (fetchedUser.resources[resourceId] || 0) + quantityToBuy;

      await updateUser(fetchedUser);

      return {
        message: 'Purchase successful',
        resourceId,
        quantity: fetchedUser.resources[resourceId],
        money: fetchedUser.money,
      };
    },
    {
      body: t.Object({ quantity: t.Optional(t.Number()) }),
    }
  );

export default buyResource;
