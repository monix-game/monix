import { Elysia, t } from 'elysia';
import { getUserByUUID, updateUser } from '../../db';
import { deriveAuth, onlyActive } from '../../middleware';
import { generatePrice } from '../../helpers/market';

export const sellResource = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post(
    '/:resourceId/sell',
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
      const quantityToSell: number = Number((body as { quantity?: unknown }).quantity || 0);

      if (Number.isNaN(quantityToSell) || quantityToSell <= 0) {
        set.status = 400;
        return { error: 'Invalid quantity' };
      }

      const totalValue = resourcePrice * quantityToSell;

      const currentQuantity = fetchedUser.resources
        ? fetchedUser.resources[resourceId] || 0
        : 0;
      if (fetchedUser.resources === undefined || currentQuantity < quantityToSell) {
        set.status = 400;
        return { error: 'Insufficient resources to sell' };
      }

      // Deduct resources and add balance
      fetchedUser.resources[resourceId] = currentQuantity - quantityToSell;
      fetchedUser.money = (fetchedUser.money || 0) + Number(totalValue);

      await updateUser(fetchedUser);

      return {
        message: 'Sale successful',
        resourceId,
        quantity: fetchedUser.resources[resourceId],
        money: fetchedUser.money,
      };
    },
    {
      body: t.Object({ quantity: t.Optional(t.Number()) }),
    }
  );

export default sellResource;
