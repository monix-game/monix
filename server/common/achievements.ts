export interface AchievementInfo {
  id: string;
  icon: string;
  name: string;
  description: string;
  requirement: string;
}

export const ACHIEVEMENTS: AchievementInfo[] = [
  {
    id: 'first_fish',
    icon: '🎣',
    name: 'First Cast',
    description: 'Catch your first fish.',
    requirement: '1 fish caught',
  },
  {
    id: 'market_maker',
    icon: '📈',
    name: 'Market Maker',
    description: 'Buy 25 resources.',
    requirement: '25 resources bought',
  },
  {
    id: 'pet_parent',
    icon: '🐾',
    name: 'Pet Parent',
    description: 'Adopt your first pet.',
    requirement: '1 pet adopted',
  },
  {
    id: 'millionaire',
    icon: '💰',
    name: 'Millionaire',
    description: 'Reach 1 million money.',
    requirement: '1,000,000 money',
  },
  {
    id: 'billionaire',
    icon: '💎',
    name: 'Billionaire',
    description: 'Reach 1 billion money.',
    requirement: '1,000,000,000 money',
  },
  {
    id: 'dedicated',
    icon: '🔥',
    name: 'Dedicated',
    description: 'Play for 10 hours.',
    requirement: '10 hours played',
  },
  {
    id: 'collector',
    icon: '🏆',
    name: 'Collector',
    description: 'Own five pets at once.',
    requirement: '5 pets owned',
  },
  {
    id: 'reborn',
    icon: '🌟',
    name: 'Reborn',
    description: 'Prestige for the first time.',
    requirement: '1 prestige',
  },
];

export function getEligibleAchievementIds(user: {
  money?: number;
  petsOwned?: number;
  prestige?: { count?: number };
  stats?: {
    fish_caught?: number;
    resources_bought?: number;
    pets_adopted?: number;
    playtime_ms?: number;
  };
}): string[] {
  const stats = user.stats || {};
  const checks: Record<string, boolean> = {
    first_fish: (stats.fish_caught || 0) >= 1,
    market_maker: (stats.resources_bought || 0) >= 25,
    pet_parent: (stats.pets_adopted || 0) >= 1,
    millionaire: (user.money || 0) >= 1_000_000,
    billionaire: (user.money || 0) >= 1_000_000_000,
    dedicated: (stats.playtime_ms || 0) >= 10 * 60 * 60 * 1000,
    collector: (user.petsOwned || 0) >= 5,
    reborn: (user.prestige?.count || 0) >= 1,
  };
  return Object.entries(checks)
    .filter(([, eligible]) => eligible)
    .map(([id]) => id);
}
