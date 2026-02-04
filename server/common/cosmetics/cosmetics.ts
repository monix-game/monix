import type { Cosmetic } from './cosmetic';

export const cosmetics: Cosmetic[] = [
  {
    id: 'og-tag',
    name: 'OG Tag',
    type: 'tag',
    tagIcon: '🔥',
    tagName: 'OG',
    tagColour: 'red',
    rarity: 'godlike',
    buyable: false,
  },
  {
    id: 'mwga-tag',
    name: 'MWGA Tag',
    type: 'tag',
    tagIcon: '💧',
    tagName: 'MWGA',
    tagColour: 'blue',
    rarity: 'godlike',
    buyable: false,
  },
];
