import { Elysia, t } from 'elysia';
import { deriveAuth, onlyActive } from '../../middleware';
import { generatePrice } from '../../helpers/market';
import { resources } from '../../../common/resources';

export const prices = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .get(
    '/prices',
    ({ query }) => {
      const { timestamp } = query;

      let time = Math.floor(Date.now() / 1000);
      if (timestamp) {
        const tsNum = Number(timestamp);
        if (!Number.isNaN(tsNum)) {
          time = tsNum;
        }
      }

      const data = resources.map(r => {
        const price = generatePrice(r.id, time);
        return { resource_id: r.id, price };
      });
      return { success: true, data };
    },
    {
      query: t.Object({ timestamp: t.Optional(t.String()) }),
    }
  );

export default prices;
