import { api } from './api';

export interface LeaderboardEntry {
  rank: number;
  username: string;
  money: number;
  netWorth?: number;
  avatar?: string;
  role: 'owner' | 'admin' | 'mod' | 'helper' | 'user';
  magic_jellybean_active?: boolean;
  cosmetics: {
    nameplate?: string;
    user_tag?: string;
  };
}

export interface FishLeaderboardEntry {
  rank: number;
  username: string;
  fishCaught: number;
  avatar?: string;
  role: 'owner' | 'admin' | 'mod' | 'helper' | 'user';
  magic_jellybean_active?: boolean;
  cosmetics: {
    nameplate?: string;
    user_tag?: string;
  };
}

export interface PlaytimeLeaderboardEntry {
  rank: number;
  username: string;
  playtimeMs: number;
  avatar?: string;
  role: 'owner' | 'admin' | 'mod' | 'helper' | 'user';
  magic_jellybean_active?: boolean;
  cosmetics: {
    nameplate?: string;
    user_tag?: string;
  };
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[] | null> {
  try {
    const resp = await api.get<LeaderboardEntry[]>('/leaderboard');
    return resp?.success ? resp.data || [] : null;
  } catch {
    return null;
  }
}

export async function fetchPlaytimeLeaderboard(): Promise<PlaytimeLeaderboardEntry[] | null> {
  try {
    const resp = await api.get<PlaytimeLeaderboardEntry[]>('/leaderboard/playtime');
    return resp?.success ? resp.data || [] : null;
  } catch {
    return null;
  }
}

export async function fetchFishLeaderboard(): Promise<FishLeaderboardEntry[] | null> {
  try {
    const resp = await api.get<FishLeaderboardEntry[]>('/leaderboard/fish');
    return resp?.success ? resp.data || [] : null;
  } catch {
    return null;
  }
}
