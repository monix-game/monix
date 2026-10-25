import { Elysia, t } from 'elysia';
import { deriveAuth, onlyActive } from '../../middleware';
import { buildResourceHistory } from '../../helpers/snapshots';
import { type GraphRangeKey, rangeSeconds } from '../../../common/graph';

export const history = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .get(
    '/history/:resourceId',
    ({ params, query }) => {
      const { resourceId } = params;
      const rangeKey = (query.range || query.range_key) as GraphRangeKey | undefined;
      const rangeSecs = rangeKey
        ? rangeSeconds(rangeKey)
        : Math.max(1, Number(query.hours_back || 2)) * 3_600;
      return { success: true, data: buildResourceHistory(resourceId, rangeSecs) };
    },
    {
      query: t.Object({
        range: t.Optional(t.String()),
        range_key: t.Optional(t.String()),
        hours_back: t.Optional(t.String()),
      }),
    }
  );

export default history;
