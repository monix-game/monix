import { api } from './api';
import type { DailyReward } from '../../server/common/rewards/dailyRewards';

export interface DailyRewardClaimResult {
  claimed: boolean;
  streak: number;
  reward?: DailyReward;
}

export async function claimDailyReward(): Promise<DailyRewardClaimResult | null> {
  try {
    const resp = await api.post<DailyRewardClaimResult>('/user/daily-reward/claim');
    if (resp?.success && resp.data) {
      return resp.data;
    }
    return null;
  } catch (err) {
    console.error('Error claiming daily reward', err);
    return null;
  }
}
