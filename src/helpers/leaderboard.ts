import { api } from './api';

export interface LeaderboardEntry {
  rank: number;
  username: string;
  money: number;
  avatar?: string;
  role: 'owner' | 'admin' | 'mod' | 'helper' | 'user';
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[] | null> {
  try {
    const resp = await api.get<{ leaderboard: LeaderboardEntry[] }>('/leaderboard');
    if (resp?.success) {
      return resp.data?.leaderboard || null;
    } else {
      return null;
    }
  } catch {
    return null;
  }
}
