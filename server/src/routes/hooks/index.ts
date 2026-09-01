import { Elysia } from 'elysia';
import stripe from './stripe';
import session from './session';

export const hooksRoutes = new Elysia().use(stripe).use(session);

export default hooksRoutes;
