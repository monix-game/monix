import { Elysia } from 'elysia';
import { deriveAuth, onlyActive } from '../../middleware';
import { buildPlaytimeLeaderboardCached } from '../../helpers/snapshots';

export const leaderboardPlaytime = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .get('/playtime', async () => {
    return buildPlaytimeLeaderboardCached();
  });

export default leaderboardPlaytime;