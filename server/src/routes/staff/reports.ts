import { Elysia } from 'elysia';
import { getAllReports } from '../../db';
import { deriveAuth, onlyRole } from '../../middleware';

export const listReports = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyRole('mod'))
  .get('/reports', async () => {
    const reports = await getAllReports();
    return { reports };
  });

export default listReports;
