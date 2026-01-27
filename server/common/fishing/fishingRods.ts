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
    price: 50,
    multiplier: 1.2,
    buyable: true,
  },
  {
    id: 'wooden-rod',
    name: 'Wooden Rod',
    price: 150,
    multiplier: 1.5,
    buyable: true,
  },
  {
    id: 'fiberglass-rod',
    name: 'Fiberglass Rod',
    price: 400,
    multiplier: 2,
    buyable: true,
  },
  {
    id: 'carbon-rod',
    name: 'Carbon Rod',
    price: 1000,
    multiplier: 2.5,
    buyable: true,
  },
  {
    id: 'titanium-rod',
    name: 'Titanium Rod',
    price: 2500,
    multiplier: 3,
    buyable: true,
  },
  {
    id: 'graphite-rod',
    name: 'Graphite Rod',
    price: 6000,
    multiplier: 4,
    buyable: true,
  },
  {
    id: 'platinum-rod',
    name: 'Platinum Rod',
    price: 15000,
    multiplier: 5,
    buyable: true,
  },
  {
    id: 'diamond-rod',
    name: 'Diamond Rod',
    price: 40000,
    multiplier: 7,
    buyable: true,
  },
  {
    id: 'toxic-rod',
    name: 'Toxic Rod',
    price: 75000,
    multiplier: 8,
    buyable: true,
  },
  {
    id: 'obsidian-rod',
    name: 'Obsidian Rod',
    price: 100000,
    multiplier: 10,
    buyable: true,
  },
  {
    id: 'celestial-rod',
    name: 'Celestial Rod',
    price: 500000,
    multiplier: 15,
    buyable: true,
  },
  {
    id: 'nebula-rod',
    name: 'Nebula Rod',
    price: 1250000,
    multiplier: 20,
    buyable: true,
  },
  {
    id: 'astral-rod',
    name: 'Astral Rod',
    price: 3000000,
    multiplier: 25,
    buyable: true,
  },
  {
    id: 'lunar-rod',
    name: 'Lunar Rod',
    price: 5000000,
    multiplier: 30,
    buyable: true,
  },
  {
    id: 'void-rod',
    name: 'Void Rod',
    price: 7500000,
    multiplier: 35,
    buyable: true,
  },
  {
    id: 'quantum-rod',
    name: 'Quantum Rod',
    price: 20000000,
    multiplier: 50,
    buyable: true,
  },
  {
    id: 'infinity-rod',
    name: 'Infinity Rod',
    price: 50000000,
    multiplier: 100,
    buyable: true,
  },
];
