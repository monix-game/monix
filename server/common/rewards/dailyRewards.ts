export type DailyRewardType = 'money' | 'gems';

export interface DailyReward {
  day: number;
  type: DailyRewardType;
  amount: number;
}

export const DAILY_REWARDS: DailyReward[] = [
  { day: 1, type: 'money', amount: 250 },
  { day: 2, type: 'money', amount: 500 },
  { day: 3, type: 'money', amount: 1250 },
  { day: 4, type: 'money', amount: 1750 },
  { day: 5, type: 'money', amount: 2500 },
  { day: 6, type: 'money', amount: 5000 },
  { day: 7, type: 'gems', amount: 50 },
];
