import { Elysia } from 'elysia';

export const pingRoutes = new Elysia().get('/', () => {
  return { ok: true, serverTime: Date.now() };
});

export default pingRoutes;
