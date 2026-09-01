import type { Rarity } from '../rarities';

export interface Cosmetic {
  id: string;
  name: string;
  type: 'nameplate' | 'tag';
  nameplateStyle?: string;
  tagIcon?: string;
  tagName?: string;
  tagColour?: 'primary' | 'red' | 'blue' | 'purple';
  rarity: Rarity;
  price?: number;
  buyable: boolean;
}
