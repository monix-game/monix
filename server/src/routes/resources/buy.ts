import { Elysia, t } from 'elysia';
import { mutateUserAndSave } from '../../db';
import { deriveAuth, onlyActive } from '../../middleware';
import { DEFAULT_USER_STATS } from '../../../common/models/user';
import { generatePrice } from '../../helpers/market';

type BuyOutcome =
  | { ok: 'error'; status: number; error: string }
  | {
      ok: 'success';
      message: string;
      resourceId: string;
      quantity: number;
      money: number;
    };

export const buyResource = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post(
    '/:resourceId/buy',
    async ({ params, body, authUser, set }) => {
      const resourceId = params.resourceId;
      const user_uuid = authUser?.uuid as string;

      const quantityToBuy: number = Number((body as { quantity?: unknown }).quantity || 0);
      if (Number.isNaN(quantityToBuy) || quantityToBuy <= 0) {
        set.status = 400;
        return { error: 'Invalid quantity' };
      }

      const resourcePrice = generatePrice(resourceId, Math.floor(Date.now() / 1000));
      const totalCost = resourcePrice * quantityToBuy;

      const result = await mutateUserAndSave<BuyOutcome>(
        user_uuid,
        async fetchedUser => {
          if (fetchedUser.money === undefined || fetchedUser.money < totalCost) {
            return {
              changed: false,
              value: { ok: 'error', status: 400, error: 'Insufficient balance' },
            };
          }

          // Deduct balance and add resources
          fetchedUser.money -= totalCost;
          if (!fetchedUser.resources) {
            fetchedUser.resources = {};
          }
          fetchedUser.resources[resourceId] =
            (fetchedUser.resources[resourceId] || 0) + quantityToBuy;

          fetchedUser.stats ??= DEFAULT_USER_STATS;
          fetchedUser.stats.resource_buys = (fetchedUser.stats.resource_buys || 0) + 1;
          fetchedUser.stats.resources_bought =
            (fetchedUser.stats.resources_bought || 0) + quantityToBuy;

          return {
            changed: true,
            value: {
              ok: 'success',
              message: 'Purchase successful',
              resourceId,
              quantity: fetchedUser.resources[resourceId],
              money: fetchedUser.money,
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
      body: t.Object({ quantity: t.Optional(t.Number()) }),
    }
  );

export default buyResource;
