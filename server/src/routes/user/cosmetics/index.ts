import { Elysia } from 'elysia';
import buyCosmetic from './buy';
import equipCosmetic from './equip';
import unequipCosmetic from './unequip';

export const cosmeticsRoutes = new Elysia()
  .use(buyCosmetic)
  .use(equipCosmetic)
  .use(unequipCosmetic);

export default cosmeticsRoutes;
