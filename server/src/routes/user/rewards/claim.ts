import { Elysia } from 'elysia';
import { getUserByUUIDFresh, tryClaimDailyReward } from '../../../db';
import { deriveAuth, onlyActive } from '../../../middleware';
import { DAILY_REWARDS } from '../../../../common/rewards/dailyRewards';
import { getTimeZoneDayIndex, SYDNEY_TIME_ZONE } from '../../../../common/timezone';

export const claimDailyReward = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post('/daily-reward/claim', async ({ authUser, set }) => {
    const user = authUser;
    if (!user) {
      set.status = 404;
      return { error: 'User not found' };
    }

    type ClaimOutcome =
      | { claimed: false; streak: number }
      | { claimed: true; streak: number; reward: (typeof DAILY_REWARDS)[number] };

    const currentDay = getTimeZoneDayIndex(Date.now(), SYDNEY_TIME_ZONE);

    // Read fresh state (bypassing Redis) to compute the streak. The actual
    // grant below is atomic and guarded, so this can never double-credit.
    const freshUser = await getUserByUUIDFresh(user.uuid);
    if (!freshUser) {
      set.status = 404;
      return { error: 'User not found' };
    }

    const dailyRewardsState = freshUser.daily_rewards || {
      last_claimed_day: 0,
      streak: 0,
    };
    const lastClaimedDay = dailyRewardsState.last_claimed_day || 0;
    const lastStreak = dailyRewardsState.streak || 0;

    if (lastClaimedDay === currentDay) {
      return { claimed: false, streak: lastStreak } satisfies ClaimOutcome;
    }

    const isConsecutive = lastClaimedDay === currentDay - 1;
    let newStreak = isConsecutive ? lastStreak + 1 : 1;
    if (newStreak > DAILY_REWARDS.length) {
      newStreak = 1;
    }

    const reward = DAILY_REWARDS[newStreak - 1];
    const rewardMultiplier = 1 + (freshUser.permanent_upgrades?.daily_fortune || 0) * 0.1;
    const adjustedReward = { ...reward, amount: Math.floor(reward.amount * rewardMultiplier) };
    const moneyDelta = adjustedReward.type === 'money' ? adjustedReward.amount : 0;
    const gemsDelta = adjustedReward.type === 'gems' ? adjustedReward.amount : 0;

    const claimed = await tryClaimDailyReward(
      user.uuid,
      currentDay,
      moneyDelta,
      gemsDelta,
      newStreak
    );

    if (!claimed) {
      return { claimed: false, streak: lastStreak } satisfies ClaimOutcome;
    }

    return {
      claimed: true,
      streak: newStreak,
      reward: adjustedReward,
    } satisfies ClaimOutcome;
  });

export default claimDailyReward;