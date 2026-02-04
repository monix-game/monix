export interface Cosmetic {
  id: string;
  name: string;
  type: 'nameplate' | 'messageplate' | 'tag' | 'frame';
  nameplateStyle?: string;
  messageplateStyle?: string;
  frameStyle?: string;
  tagIcon?: string;
  tagName?: string;
  tagColour?: 'primary' | 'red' | 'blue' | 'purple';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'godlike';
  price?: number;
  buyable: boolean;
}
