export interface FishingRodInfo {
  id: string;
  name: string;
  price: number;
  multiplier: number;
  buyable: boolean;
}

export const fishingRods: FishingRodInfo[] = [
  {
    id: 'damaged-rod',
    name: 'Damaged Rod',
    price: 0,
    multiplier: 1,
    buyable: false,
  }
];
