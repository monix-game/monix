import { Elysia, t } from 'elysia';
import { getRecentLogEntries } from '../../db';
import { deriveAuth, onlyRole } from '../../middleware';

export const logs = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyRole('mod'))
  .get('/logs', async ({ query }) => {
    const rawLimit = Number(query.limit);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 500) : 200;
    const logs = await getRecentLogEntries(limit);

    return { logs };
  }, {
    query: t.Object({ limit: t.Optional(t.String()) }),
  });

export default logs;
