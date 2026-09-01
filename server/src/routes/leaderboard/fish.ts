import { Elysia } from 'elysia';
import { deriveAuth, onlyActive } from '../../middleware';
import { buildFishLeaderboard } from '../../helpers/snapshots';

export const leaderboardFish = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .get('/fish', async () => {
    return buildFishLeaderboard();
  });

export default leaderboardFish;