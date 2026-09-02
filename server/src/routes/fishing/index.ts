import { Elysia } from 'elysia';
import { deriveAuth, onlyFeatureEnabled } from '../../middleware';
import aquarium from './aquarium';
import upgradeAquarium from './aquarium-upgrade';
import sellFish from './aquarium-sell';
import sellAllFish from './aquarium-sell-all';
import buyRod from './buy-rod';
import equipRod from './equip-rod';
import sellRod from './sell-rod';
import buyBait from './buy-bait';
import equipBait from './equip-bait';
import unequipBait from './unequip-bait';
import fish from './fish';

export const fishingRoutes = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyFeatureEnabled('fishingAquarium'))
  .use(aquarium)
  .use(upgradeAquarium)
  .use(sellFish)
  .use(sellAllFish)
  .use(buyRod)
  .use(equipRod)
  .use(sellRod)
  .use(buyBait)
  .use(equipBait)
  .use(unequipBait)
  .use(fish);

export default fishingRoutes;
