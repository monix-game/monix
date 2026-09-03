export interface UpgradeInfo {
  id: string;
  icon?: string;
  name: string;
  description: string;
  price_per_half_hour: number;
}

export interface PermanentUpgradeInfo {
  id: string;
  icon: string;
  name: string;
  description: string;
  maxLevel: number;
  baseCost: number;
}

export const PERMANENT_UPGRADES: PermanentUpgradeInfo[] = [
  {
    id: 'angler_instinct',
    icon: '🧭',
    name: 'Angler Instinct',
    description: '+8% fish weight per level.',
    maxLevel: 10,
    baseCost: 1,
  },
  {
    id: 'deep_pockets',
    icon: '🪙',
    name: 'Deep Pockets',
    description: '+5% passive pet income per level.',
    maxLevel: 10,
    baseCost: 2,
  },
  {
    id: 'lucky_tide',
    icon: '🌊',
    name: 'Lucky Tide',
    description: '+5% event modifier chance per level.',
    maxLevel: 10,
    baseCost: 3,
  },
  {
    id: 'market_instinct',
    icon: '📊',
    name: 'Market Instinct',
    description: '+4% money from resource sales per level.',
    maxLevel: 10,
    baseCost: 2,
  },
  {
    id: 'expanded_kennel',
    icon: '🏡',
    name: 'Expanded Kennel',
    description: '+1 maximum pet slot per level.',
    maxLevel: 7,
    baseCost: 3,
  },
  {
    id: 'daily_fortune',
    icon: '🎁',
    name: 'Daily Fortune',
    description: '+10% daily reward value per level.',
    maxLevel: 10,
    baseCost: 2,
  },
];

export function permanentUpgradeCost(upgrade: PermanentUpgradeInfo, currentLevel: number): number {
  return Math.floor(upgrade.baseCost * Math.pow(2, currentLevel));
}

export const MAGIC_JELLYBEAN_UPGRADE_ID = 'magic_jellybean';
export const HEAVY_LINE_UPGRADE_ID = 'heavy_line';
export const LUCKY_CHARM_UPGRADE_ID = 'lucky_charm';

export const UPGRADES: UpgradeInfo[] = [
  {
    id: MAGIC_JELLYBEAN_UPGRADE_ID,
    icon: '🍭',
    name: 'Magic Jellybean',
    description: 'Halves the fishing cooldown for 30 minutes.',
    price_per_half_hour: 100000,
  },
  {
    id: HEAVY_LINE_UPGRADE_ID,
    icon: '🪢',
    name: 'Heavy Line',
    description: 'Makes every catch 25% heavier for 30 minutes.',
    price_per_half_hour: 90000,
  },
  {
    id: LUCKY_CHARM_UPGRADE_ID,
    icon: '🍀',
    name: 'Lucky Charm',
    description: 'Doubles your chance to catch event-modified fish for 30 minutes.',
    price_per_half_hour: 85000,
  },
];

export function isUpgradeActive(
  upgrades: Record<string, { expires_at: number }> | undefined,
  upgradeId: string,
  now: number = Date.now()
): boolean {
  const expiresAt = upgrades?.[upgradeId]?.expires_at;
  return typeof expiresAt === 'number' && expiresAt > now;
}
