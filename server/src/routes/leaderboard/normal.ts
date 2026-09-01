import { Elysia } from 'elysia';
import { deriveAuth, onlyActive } from '../../middleware';
import { buildMoneyLeaderboard } from '../../helpers/snapshots';

export const leaderboardNormal = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .get('/', async () => {
    return buildMoneyLeaderboard();
  });

export default leaderboardNormal;