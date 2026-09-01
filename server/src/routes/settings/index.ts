import { Elysia } from 'elysia';
import features from './features';
import update from './update';
import set from './set';

export const settingsRoutes = new Elysia().use(features).use(update).use(set);

export default settingsRoutes;
