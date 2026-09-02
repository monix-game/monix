import { Elysia } from 'elysia';
import { deriveAuth, onlyAuth } from '../../middleware';
import { VAPID_PUBLIC_KEY } from '../../constants';

export const getVapidKey = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyAuth)
  .get('/vapid', () => {
    return { publicKey: VAPID_PUBLIC_KEY };
  });

export default getVapidKey;
