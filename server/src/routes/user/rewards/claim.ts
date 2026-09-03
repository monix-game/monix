import { Elysia } from 'elysia';
import { mutateUserAndSave } from '../../../db';
import { deriveAuth, onlyActive } from '../../../middleware';
import { DAILY_REWARDS } from '../../../../common/rewards/dailyRewards';
import { DEFAULT_USER_STATS } from '../../../../common/models/user';
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

    const result = await mutateUserAndSave<ClaimOutcome>(user.uuid, async fetchedUser => {
      const currentDay = getTimeZoneDayIndex(Date.now(), SYDNEY_TIME_ZONE);
      const dailyRewardsState = fetchedUser.daily_rewards || {
        last_claimed_day: 0,
        streak: 0,
      };
      const lastClaimedDay = dailyRewardsState.last_claimed_day || 0;
      const lastStreak = dailyRewardsState.streak || 0;

      if (lastClaimedDay === currentDay) {
        return { changed: false, value: { claimed: false, streak: lastStreak } };
      }

      const isConsecutive = lastClaimedDay === currentDay - 1;
      let newStreak = isConsecutive ? lastStreak + 1 : 1;
      if (newStreak > DAILY_REWARDS.length) {
        newStreak = 1;
      }

      const reward = DAILY_REWARDS[newStreak - 1];
      const rewardMultiplier = 1 + (fetchedUser.permanent_upgrades?.daily_fortune || 0) * 0.1;
      const adjustedReward = { ...reward, amount: Math.floor(reward.amount * rewardMultiplier) };
      if (adjustedReward.type === 'money') {
        fetchedUser.money += adjustedReward.amount;
      } else {
        fetchedUser.gems += adjustedReward.amount;
      }

      fetchedUser.daily_rewards = { last_claimed_day: currentDay, streak: newStreak };
      fetchedUser.stats ??= DEFAULT_USER_STATS;
      fetchedUser.stats.daily_rewards_claimed = (fetchedUser.stats.daily_rewards_claimed || 0) + 1;

      return { changed: true, value: { claimed: true, streak: newStreak, reward: adjustedReward } };
    });

    if (!result) {
      set.status = 404;
      return { error: 'User not found' };
    }
    return result;
  });

export default claimDailyReward;
