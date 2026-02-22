export interface UpgradeInfo {
  id: string;
  icon?: string;
  name: string;
  description: string;
  price_per_half_hour: number;
}

export const MAGIC_JELLYBEAN_UPGRADE_ID = 'magic_jellybean';

export const UPGRADES: UpgradeInfo[] = [
  {
    id: MAGIC_JELLYBEAN_UPGRADE_ID,
    icon: '🍭',
    name: 'Magic Jellybean',
    description: 'Halves the fishing cooldown for 30 minutes.',
    price_per_half_hour: 100000, // 100k gems per 30 minutes
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
