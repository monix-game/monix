import { Elysia } from 'elysia';
import { updateUser } from '../../../db';
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

    const currentDay = getTimeZoneDayIndex(Date.now(), SYDNEY_TIME_ZONE);
    const dailyRewardsState = user.daily_rewards || { last_claimed_day: 0, streak: 0 };
    const lastClaimedDay = dailyRewardsState.last_claimed_day || 0;
    const lastStreak = dailyRewardsState.streak || 0;

    if (lastClaimedDay === currentDay) {
      return { claimed: false, streak: lastStreak };
    }

    const isConsecutive = lastClaimedDay === currentDay - 1;
    let newStreak = isConsecutive ? lastStreak + 1 : 1;
    if (newStreak > DAILY_REWARDS.length) {
      newStreak = 1;
    }

    const reward = DAILY_REWARDS[newStreak - 1];
    if (reward.type === 'money') {
      user.money += reward.amount;
    } else {
      user.gems += reward.amount;
    }

    user.daily_rewards = { last_claimed_day: currentDay, streak: newStreak };
    await updateUser(user);

    return { claimed: true, streak: newStreak, reward };
  });

export default claimDailyReward;
