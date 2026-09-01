import { Elysia } from 'elysia';
import { deriveAuth, onlyActive } from '../../middleware';
import { generatePrice } from '../../helpers/market';

export const price = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .get('/price/:resourceId', ({ params, query }) => {
    const { resourceId } = params;
    const { timestamp } = query;

    let time = Math.floor(Date.now() / 1000);
    if (timestamp) {
      const tsNum = Number(timestamp);
      if (!Number.isNaN(tsNum)) {
        time = tsNum;
      }
    }

    const price = generatePrice(resourceId, time);
    const price_data = { resource_id: resourceId, price };
    return { success: true, data: price_data };
  });

export default price;
