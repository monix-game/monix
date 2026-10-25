export interface UpgradeInfo {
  id: string;
  icon?: string;
  name: string;
  description: string;
  price_per_half_hour: number;
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
