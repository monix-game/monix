import { Elysia } from 'elysia';
import { deriveAuth } from '../../middleware';
import playCasino from './play';

export const casinoRoutes = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .use(playCasino);

export default casinoRoutes;
