import { Elysia } from 'elysia';
import { getGlobalSettings } from '../../db';
import { deriveAuth, onlyRole } from '../../middleware';

export const getFeatures = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyRole('admin'))
  .get('/features', async () => {
    const settings = await getGlobalSettings();
    return { settings };
  });

export default getFeatures;
