import { Elysia } from 'elysia';
import { deriveAuth, onlyFeatureEnabled } from '../../middleware';
import all from './all';
import resource from './resource';
import buy from './buy';
import sell from './sell';

export const resourcesRoutes = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyFeatureEnabled('resourcesMarket'))
  .use(all)
  .use(resource)
  .use(buy)
  .use(sell);

export default resourcesRoutes;
