import { Elysia, t } from 'elysia';
import { deriveAuth, onlyActive } from '../../middleware';
import { buildResourceHistory } from '../../helpers/snapshots';

export const history = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .get(
    '/history/:resourceId',
    ({ params, query }) => {
      const { resourceId } = params;
      const hoursBack = Number(query.hours_back || 2);
      return { success: true, data: buildResourceHistory(resourceId, hoursBack) };
    },
    {
      query: t.Object({ hours_back: t.Optional(t.String()) }),
    }
  );

export default history;