import { Elysia } from 'elysia';
import getVapidKey from './vapid';
import subscribePush from './subscribe';
import unsubscribePush from './unsubscribe';

export const pushRoutes = new Elysia().use(getVapidKey).use(subscribePush).use(unsubscribePush);

export default pushRoutes;
