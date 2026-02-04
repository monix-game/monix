export interface Cosmetic {
  id: string;
  name: string;
  type: 'nameplate' | 'messageplate' | 'tag';
  nameplateStyle?: string;
  messageplateStyle?: string;
  tagIcon?: string;
  tagName?: string;
  tagColour?: 'primary' | 'red' | 'blue' | 'purple';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'godlike';
  price?: number;
  buyable: boolean;
}
