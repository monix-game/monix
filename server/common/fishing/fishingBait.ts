export interface FishingBaitInfo {
  id: string;
  name: string;
  price: number;
  fish_types_boosted: string[]; // Array of fish type IDs that this bait boosts
}

export const fishingBaits: FishingBaitInfo[] = [
  {
    id: 'worm_bait',
    name: 'Worm Bait',
    price: 50,
    fish_types_boosted: ['cod', 'salmon', 'trout', 'haddock', 'flathead'],
  },

  {
    id: 'insect_bait',
    name: 'Insect Bait',
    price: 75,
    fish_types_boosted: ['snapper', 'grouper', 'pufferfish', 'anglerfish'],
  },
  {
    id: 'shrimp_bait',
    name: 'Shrimp Bait',
    price: 100,
    fish_types_boosted: ['clownfish', 'stingray', 'prawn', 'crab', 'lobster'],
  },

  {
    id: 'plankton_bait',
    name: 'Plankton Bait',
    price: 125,
    fish_types_boosted: ['jellyfish', 'oyster', 'goldfish', 'eel'],
  },
  {
    id: 'meat_bait',
    name: 'Meat Bait',
    price: 150,
    fish_types_boosted: ['crocodile', 'alligator', 'cuttlefish', 'octopus'],
  },
  {
    id: 'squid_bait',
    name: 'Squid Bait',
    price: 200,
    fish_types_boosted: ['shark', 'whale', 'orca', 'swordfish', 'squid'],
  },
];
