import { Elysia } from 'elysia';
import { getAllAppeals } from '../../db';
import { deriveAuth, onlyRole } from '../../middleware';

export const listAppeals = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyRole('mod'))
  .get('/appeals', async () => {
    const appeals = await getAllAppeals();
    return { appeals };
  });

export default listAppeals;
