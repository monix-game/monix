import { Elysia } from 'elysia';
import { getAllAppeals, getUsersByUUID } from '../../db';
import { deriveAuth, onlyRole } from '../../middleware';

export const listAppeals = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyRole('mod'))
  .get('/appeals', async () => {
    const appeals = await getAllAppeals();

    const userUuids = Array.from(new Set(appeals.map(a => a.user_uuid).filter(Boolean)));
    const users = userUuids.length > 0 ? await getUsersByUUID(userUuids) : [];
    const usernameByUuid = new Map(users.map(u => [u.uuid, u.username]));

    const enrichedAppeals = appeals.map(a => ({
      ...a,
      user_username: usernameByUuid.get(a.user_uuid) || a.user_uuid,
    }));

    return { appeals: enrichedAppeals };
  });

export default listAppeals;