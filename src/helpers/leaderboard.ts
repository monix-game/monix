import { api } from './api';

export interface LeaderboardEntry {
  rank: number;
  username: string;
  money: number;
  avatar?: string;
  role: 'owner' | 'admin' | 'mod' | 'helper' | 'user';
  cosmetics: {
    nameplate?: string;
    user_tag?: string;
    frame?: string;
  };
}

export async function fetchLeaderboard(): Promise<{
  normal: LeaderboardEntry[];
  noStaff: LeaderboardEntry[];
} | null> {
  try {
    const resp = await api.get<{ normal: LeaderboardEntry[]; noStaff: LeaderboardEntry[] }>(
      '/leaderboard'
    );
    if (resp?.success) {
      return {
        normal: resp.data?.normal || [],
        noStaff: resp.data?.noStaff || [],
      };
    } else {
      return null;
    }
  } catch {
    return null;
  }
}
