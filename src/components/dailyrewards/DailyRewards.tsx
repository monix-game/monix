import React, { useEffect, useMemo, useState } from 'react';
import styles from './DailyRewards.module.css';
import { Button } from '../button/Button';
import { EmojiText } from '../EmojiText';
import { claimDailyReward } from '../../helpers/rewards';
import { DAILY_REWARDS, type DailyReward } from '../../../server/common/rewards/dailyRewards';
import { formatRemainingTime, smartFormatNumber } from '../../../server/common/math';
import {
  getTimeZoneDateUtc,
  getTimeZoneDayIndex,
  getTimeZoneParts,
  SYDNEY_TIME_ZONE,
} from '../../../server/common/timezone';
import type { IUser } from '../../../server/common/models/user';

interface DailyRewardsProps {
  user: IUser;
  refreshUser: () => Promise<void>;
}

function rewardLabel(reward: DailyReward): string {
  return reward.type === 'money'
    ? `+${smartFormatNumber(reward.amount)}`
    : `+${reward.amount} Gems`;
}

function rewardIcon(reward: DailyReward): string {
  return reward.type === 'money' ? '💰' : '💎';
}

export const DailyRewards: React.FC<DailyRewardsProps> = ({ user, refreshUser }) => {
  const [now, setNow] = useState(() => Date.now());
  const [isClaiming, setIsClaiming] = useState(false);
  const [lastClaim, setLastClaim] = useState<DailyReward | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const currentDay = getTimeZoneDayIndex(now, SYDNEY_TIME_ZONE);
  const savedStreak = user.daily_rewards?.streak ?? 0;
  const lastClaimedDay = user.daily_rewards?.last_claimed_day ?? 0;
  const claimedToday = lastClaimedDay === currentDay;
  const isConsecutive = lastClaimedDay === currentDay - 1;

  // The server starts a new 7-day cycle once the previous one is complete.
  const nextStreak = claimedToday
    ? savedStreak
    : isConsecutive && savedStreak < DAILY_REWARDS.length
      ? savedStreak + 1
      : 1;

  const nextReward = DAILY_REWARDS[nextStreak - 1];
  const displayedStreak = claimedToday
    ? savedStreak
    : isConsecutive && savedStreak < DAILY_REWARDS.length
      ? savedStreak
      : 0;

  const resetInMs = useMemo(() => {
    const parts = getTimeZoneParts(now, SYDNEY_TIME_ZONE);
    const nextReset = getTimeZoneDateUtc(
      SYDNEY_TIME_ZONE,
      parts.year,
      parts.month - 1,
      parts.day + 1
    );
    return Math.max(0, nextReset - now);
  }, [now]);

  const handleClaim = async () => {
    if (claimedToday || isClaiming) return;

    setIsClaiming(true);
    setClaimError(null);

    try {
      const result = await claimDailyReward();
      if (!result) {
        setClaimError('Could not claim your reward. Please try again.');
        return;
      }

      if (!result.claimed) {
        await refreshUser();
        return;
      }

      setLastClaim(result.reward ?? null);
      await refreshUser();
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.heading}>
          <span className={styles.chest}>
            <EmojiText>🪎</EmojiText>
          </span>
          <div>
            <h2>Daily Rewards</h2>
            <p>Open the chest each day to build your streak.</p>
          </div>
        </div>
        <div className={styles.streak}>
          <span className={styles.streakLabel}>Streak</span>
          <span className={`${styles.streakValue} mono`}>
            {displayedStreak} / {DAILY_REWARDS.length}
          </span>
        </div>
      </div>

      <div className={styles.grid}>
        {DAILY_REWARDS.map(reward => {
          const isClaimed = reward.day <= displayedStreak;
          const isToday = !claimedToday && reward.day === nextStreak;

          return (
            <div
              key={reward.day}
              className={`${styles.card} ${isClaimed ? styles.claimed : ''} ${
                isToday ? styles.today : ''
              }`}
            >
              <span className={styles.day}>Day {reward.day}</span>
              <span className={styles.amount}>
                <EmojiText>{rewardIcon(reward)}</EmojiText> {rewardLabel(reward)}
              </span>
              {isToday && <span className={styles.todayBadge}>Today</span>}
            </div>
          );
        })}
      </div>

      <div className={styles.footer}>
        <Button
          onClickAsync={handleClaim}
          isLoading={isClaiming}
          disabled={claimedToday}
          className={styles.claimButton}
        >
          {claimedToday
            ? 'Claimed — come back tomorrow'
            : `Claim Day ${nextStreak}: ${rewardLabel(nextReward)}`}
        </Button>
        <span className={styles.reset}>
          Next chest in {formatRemainingTime(Math.ceil(resetInMs / 1000))}
        </span>
      </div>

      {lastClaim && (
        <p className={styles.success}>You received {rewardLabel(lastClaim)} from the chest!</p>
      )}
      {claimError && <p className={styles.error}>{claimError}</p>}
    </div>
  );
};
