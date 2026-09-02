import { Elysia } from 'elysia';
import { deriveAuth, onlyFeatureEnabled } from '../../middleware';
import news from './news';
import price from './price';
import prices from './prices';
import history from './history';

export const marketRoutes = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyFeatureEnabled('resourcesMarket'))
  .use(news)
  .use(price)
  .use(prices)
  .use(history);

export default marketRoutes;
