import { Elysia } from 'elysia';
import { deriveAuth, onlyActive } from '../../middleware';
import { buildFishLeaderboardCached } from '../../helpers/snapshots';

export const leaderboardFish = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .get('/fish', async () => {
    return buildFishLeaderboardCached();
  });

export default leaderboardFish;