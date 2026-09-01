import { Elysia } from 'elysia';
import { deriveAuth, onlyAuth } from '../../middleware';
import { buildSettings } from '../../helpers/snapshots';

export const features = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyAuth)
  .get('/features', async () => {
    return buildSettings();
  });

export default features;