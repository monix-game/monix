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
  },
  {
    id: 'basic-rod',
    name: 'Basic Rod',
    price: 500,
    multiplier: 1.2,
    buyable: true,
  },
  {
    id: 'wooden-rod',
    name: 'Wooden Rod',
    price: 1500,
    multiplier: 1.5,
    buyable: true,
  },
  {
    id: 'fiberglass-rod',
    name: 'Fiberglass Rod',
    price: 4000,
    multiplier: 2,
    buyable: true,
  },
  {
    id: 'carbon-rod',
    name: 'Carbon Rod',
    price: 10000,
    multiplier: 2.5,
    buyable: true,
  },
  {
    id: 'titanium-rod',
    name: 'Titanium Rod',
    price: 25000,
    multiplier: 3,
    buyable: true,
  },
  {
    id: 'graphite-rod',
    name: 'Graphite Rod',
    price: 60000,
    multiplier: 4,
    buyable: true,
  },
  {
    id: 'platinum-rod',
    name: 'Platinum Rod',
    price: 150000,
    multiplier: 5,
    buyable: true,
  },
  {
    id: 'diamond-rod',
    name: 'Diamond Rod',
    price: 400000,
    multiplier: 7,
    buyable: true,
  },
  {
    id: 'toxic-rod',
    name: 'Toxic Rod',
    price: 750000,
    multiplier: 8,
    buyable: true,
  },
  {
    id: 'obsidian-rod',
    name: 'Obsidian Rod',
    price: 1000000,
    multiplier: 10,
    buyable: true,
  },
  {
    id: 'celestial-rod',
    name: 'Celestial Rod',
    price: 5000000,
    multiplier: 15,
    buyable: true,
  },
  {
    id: 'astral-rod',
    name: 'Astral Rod',
    price: 30000000,
    multiplier: 25,
    buyable: true,
  },
  {
    id: 'lunar-rod',
    name: 'Lunar Rod',
    price: 50000000,
    multiplier: 30,
    buyable: true,
  },
  {
    id: 'void-rod',
    name: 'Void Rod',
    price: 75000000,
    multiplier: 35,
    buyable: true,
  },
  {
    id: 'quantum-rod',
    name: 'Quantum Rod',
    price: 200000000,
    multiplier: 50,
    buyable: true,
  },
  {
    id: 'infinity-rod',
    name: 'Infinity Rod',
    price: 500000000,
    multiplier: 100,
    buyable: true,
  },
];
