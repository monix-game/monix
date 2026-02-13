export type Rarity =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'legendary'
  | 'godlike'
  | 'unique'
  | 'special'
  | 'secret';

export const rarityEmojis: Record<Rarity, string> = {
  common: '⚪',
  uncommon: '🟢',
  rare: '🔵',
  epic: '🟣',
  legendary: '🟠',
  godlike: '🔶',
  unique: '🔴',
  special: '🟡',
  secret: '⚫',
};
