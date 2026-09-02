import { Elysia } from 'elysia';
import { deriveAuth, onlyActive } from '../../middleware';
import { buildNewsFeed } from '../../helpers/snapshots';

export const news = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .get('/news', () => {
    return { success: true, data: buildNewsFeed() };
  });

export default news;