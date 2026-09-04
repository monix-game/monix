export type FishingRodCategory =
  | 'starter'
  | 'skilled'
  | 'elite'
  | 'mythic'
  | 'cosmic'
  | 'singularity'
  | 'genesis';

export interface FishingRodCategoryInfo {
  id: FishingRodCategory;
  title: string;
  emoji: string;
  subtitle: string;
}

export const fishingRodCategories: FishingRodCategoryInfo[] = [
  { id: 'starter', title: 'Starter', emoji: '🟢', subtitle: 'Up to 10,000' },
  { id: 'skilled', title: 'Skilled', emoji: '🔷', subtitle: '25,000 - 150,000' },
  { id: 'elite', title: 'Elite', emoji: '🟣', subtitle: '400,000 - 1,000,000' },
  { id: 'mythic', title: 'Mythic', emoji: '🌌', subtitle: '2,000,000 - 30,000,000' },
  { id: 'cosmic', title: 'Cosmic', emoji: '🌠', subtitle: '50,000,000 - 500,000,000' },
  { id: 'singularity', title: 'Singularity', emoji: '🕳️', subtitle: '1,000,000,000 - 10,000,000,000' },
  { id: 'genesis', title: 'Genesis', emoji: '✨', subtitle: '25,000,000,000+' },
];

export interface FishingRodInfo {
  id: string;
  name: string;
  price: number;
  multiplier: number;
  buyable: boolean;
  category: FishingRodCategory;
}

export function getRodCategoryInfo(category: FishingRodCategory): FishingRodCategoryInfo {
  return fishingRodCategories.find(c => c.id === category)!;
}

export const fishingRods: FishingRodInfo[] = [
  {
    id: 'damaged-rod',
    name: 'Damaged Rod',
    price: 0,
    multiplier: 1,
    buyable: false,
    category: 'starter',
  },
  {
    id: 'basic-rod',
    name: 'Basic Rod',
    price: 750,
    multiplier: 1.2,
    buyable: true,
    category: 'starter',
  },
  {
    id: 'wooden-rod',
    name: 'Wooden Rod',
    price: 1500,
    multiplier: 1.5,
    buyable: true,
    category: 'starter',
  },
  {
    id: 'fiberglass-rod',
    name: 'Fiberglass Rod',
    price: 4000,
    multiplier: 2,
    buyable: true,
    category: 'starter',
  },
  {
    id: 'carbon-rod',
    name: 'Carbon Rod',
    price: 10000,
    multiplier: 2.5,
    buyable: true,
    category: 'starter',
  },
  {
    id: 'titanium-rod',
    name: 'Titanium Rod',
    price: 25000,
    multiplier: 3,
    buyable: true,
    category: 'skilled',
  },
  {
    id: 'graphite-rod',
    name: 'Graphite Rod',
    price: 60000,
    multiplier: 4,
    buyable: true,
    category: 'skilled',
  },
  {
    id: 'platinum-rod',
    name: 'Platinum Rod',
    price: 150000,
    multiplier: 5,
    buyable: true,
    category: 'skilled',
  },
  {
    id: 'diamond-rod',
    name: 'Diamond Rod',
    price: 400000,
    multiplier: 7,
    buyable: true,
    category: 'elite',
  },
  {
    id: 'toxic-rod',
    name: 'Toxic Rod',
    price: 1000000,
    multiplier: 8,
    buyable: true,
    category: 'elite',
  },
  {
    id: 'obsidian-rod',
    name: 'Obsidian Rod',
    price: 2000000,
    multiplier: 10,
    buyable: true,
    category: 'mythic',
  },
  {
    id: 'celestial-rod',
    name: 'Celestial Rod',
    price: 5000000,
    multiplier: 15,
    buyable: true,
    category: 'mythic',
  },
  {
    id: 'astral-rod',
    name: 'Astral Rod',
    price: 30000000,
    multiplier: 25,
    buyable: true,
    category: 'mythic',
  },
  {
    id: 'lunar-rod',
    name: 'Lunar Rod',
    price: 50000000,
    multiplier: 30,
    buyable: true,
    category: 'cosmic',
  },
  {
    id: 'void-rod',
    name: 'Void Rod',
    price: 75000000,
    multiplier: 35,
    buyable: true,
    category: 'cosmic',
  },
  {
    id: 'quantum-rod',
    name: 'Quantum Rod',
    price: 200000000,
    multiplier: 50,
    buyable: true,
    category: 'cosmic',
  },
  {
    id: 'infinity-rod',
    name: 'Infinity Rod',
    price: 500000000,
    multiplier: 100,
    buyable: true,
    category: 'cosmic',
  },
  {
    id: 'nebula-rod',
    name: 'Nebula Rod',
    price: 100000000,
    multiplier: 150,
    buyable: true,
    category: 'cosmic',
  },
  {
    id: 'singularity-rod',
    name: 'Singularity Rod',
    price: 1000000000,
    multiplier: 225,
    buyable: true,
    category: 'singularity',
  },
  {
    id: 'event-horizon-rod',
    name: 'Event Horizon Rod',
    price: 10000000000,
    multiplier: 325,
    buyable: true,
    category: 'singularity',
  },
  {
    id: 'chronos-rod',
    name: 'Chronos Rod',
    price: 25000000000,
    multiplier: 475,
    buyable: true,
    category: 'genesis',
  },
  {
    id: 'genesis-rod',
    name: 'Genesis Rod',
    price: 100000000000,
    multiplier: 700,
    buyable: true,
    category: 'genesis',
  },
];
