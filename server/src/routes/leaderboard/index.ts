import { Elysia } from 'elysia';
import normal from './normal';
import fish from './fish';

export const leaderboardRoutes = new Elysia().use(normal).use(fish);

export default leaderboardRoutes;
