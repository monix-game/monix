import type { Cosmetic } from './cosmetic';

export const cosmetics: Cosmetic[] = [
  // Tags
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
  {
    id: 'cool-tag',
    name: 'Cool Tag',
    type: 'tag',
    tagIcon: '😎',
    tagName: 'Cool',
    tagColour: 'purple',
    rarity: 'uncommon',
    buyable: true,
    price: 100,
  },

  // Nameplates
  {
    id: 'gold-nameplate',
    name: 'Gold Nameplate',
    type: 'nameplate',
    nameplateStyle: 'gold',
    rarity: 'epic',
    buyable: true,
    price: 500,
  },
  {
    id: 'sakura-nameplate',
    name: 'Sakura Nameplate',
    type: 'nameplate',
    nameplateStyle: 'sakura',
    rarity: 'epic',
    buyable: true,
    price: 500,
  },
];
