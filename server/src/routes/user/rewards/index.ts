import { Elysia } from 'elysia';
import claimDailyReward from './claim';

export const rewardsRoutes = new Elysia().use(claimDailyReward);

export default rewardsRoutes;
