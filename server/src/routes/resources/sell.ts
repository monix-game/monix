import { Elysia, t } from 'elysia';
import { mutateUserAndSave } from '../../db';
import { deriveAuth, onlyActive } from '../../middleware';
import { DEFAULT_USER_STATS } from '../../../common/models/user';
import { generatePrice } from '../../helpers/market';

type SellOutcome =
  | { ok: 'error'; status: number; error: string }
  | {
      ok: 'success';
      message: string;
      resourceId: string;
      quantity: number;
      money: number;
    };

export const sellResource = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post(
    '/:resourceId/sell',
    async ({ params, body, authUser, set }) => {
      const resourceId = params.resourceId;
      const user_uuid = authUser?.uuid as string;

      const quantityToSell: number = Number((body as { quantity?: unknown }).quantity || 0);
      if (Number.isNaN(quantityToSell) || quantityToSell <= 0) {
        set.status = 400;
        return { error: 'Invalid quantity' };
      }

      const resourcePrice = generatePrice(resourceId, Math.floor(Date.now() / 1000));
      const totalValue = resourcePrice * quantityToSell;

      const result = await mutateUserAndSave<SellOutcome>(user_uuid, async fetchedUser => {
        const currentQuantity = fetchedUser.resources ? fetchedUser.resources[resourceId] || 0 : 0;
        if (fetchedUser.resources === undefined || currentQuantity < quantityToSell) {
          return {
            changed: false,
            value: { ok: 'error', status: 400, error: 'Insufficient resources to sell' },
          };
        }

        // Deduct resources and add balance
        fetchedUser.resources[resourceId] = currentQuantity - quantityToSell;
        const marketBonus = 1 + (fetchedUser.permanent_upgrades?.market_instinct || 0) * 0.04;
        fetchedUser.money = (fetchedUser.money || 0) + Number(totalValue) * marketBonus;

        fetchedUser.stats ??= DEFAULT_USER_STATS;
        fetchedUser.stats.resource_sells = (fetchedUser.stats.resource_sells || 0) + 1;
        fetchedUser.stats.resources_sold = (fetchedUser.stats.resources_sold || 0) + quantityToSell;

        return {
          changed: true,
          value: {
            ok: 'success',
            message: 'Sale successful',
            resourceId,
            quantity: fetchedUser.resources[resourceId],
            money: fetchedUser.money,
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
    },
    {
      body: t.Object({ quantity: t.Optional(t.Number()) }),
    }
  );

export default sellResource;
