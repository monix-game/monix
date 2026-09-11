import { Elysia } from 'elysia';
import { getAllReports, getUsersByUUID } from '../../db';
import { deriveAuth, onlyRole } from '../../middleware';

export const listReports = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyRole('mod'))
  .get('/reports', async () => {
    const reports = await getAllReports();

    const userUuids = Array.from(
      new Set(reports.flatMap(r => [r.reporter_uuid, r.reported_uuid]).filter(Boolean))
    );
    const users = userUuids.length > 0 ? await getUsersByUUID(userUuids) : [];
    const usernameByUuid = new Map(users.map(u => [u.uuid, u.username]));

    const enrichedReports = reports.map(r => ({
      ...r,
      reporter_username: usernameByUuid.get(r.reporter_uuid) || r.reporter_uuid,
      reported_username: usernameByUuid.get(r.reported_uuid) || r.reported_uuid,
    }));

    return { reports: enrichedReports };
  });

export default listReports;
