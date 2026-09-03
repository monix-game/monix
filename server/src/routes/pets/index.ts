import { Elysia } from 'elysia';
import { deriveAuth, onlyFeatureEnabled } from '../../middleware';
import all from './all';
import adopt from './adopt';
import shop from './shop';
import name from './name';
import feed from './feed';
import play from './play';
import release from './release';
import revive from './revive';
import levelup from './levelup';
import collect from './collect';

export const petsRoutes = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyFeatureEnabled('pets'))
  .use(all)
  .use(adopt)
  .use(shop)
  .use(name)
  .use(feed)
  .use(play)
  .use(release)
  .use(revive)
  .use(levelup)
  .use(collect);

export default petsRoutes;
