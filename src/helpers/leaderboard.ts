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

export interface FishLeaderboardEntry {
  rank: number;
  username: string;
  fishCaught: number;
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

export async function fetchFishLeaderboard(): Promise<{
  normal: FishLeaderboardEntry[];
  noStaff: FishLeaderboardEntry[];
} | null> {
  try {
    const resp = await api.get<{
      normal: FishLeaderboardEntry[];
      noStaff: FishLeaderboardEntry[];
    }>('/leaderboard/fish');
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
