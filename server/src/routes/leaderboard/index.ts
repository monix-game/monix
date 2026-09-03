import { Elysia } from 'elysia';
import normal from './normal';
import fish from './fish';
import playtime from './playtime';

export const leaderboardRoutes = new Elysia().use(normal).use(fish).use(playtime);

export default leaderboardRoutes;
