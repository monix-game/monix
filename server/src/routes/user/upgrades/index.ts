import { Elysia } from 'elysia';
import buyUpgrade from './buy';

export const upgradesRoutes = new Elysia().use(buyUpgrade);

export default upgradesRoutes;
