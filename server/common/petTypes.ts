export interface PetTypeInfo {
  id: string;
  icon: string;
  name: string;
  cost: number;
}

export const petTypes: PetTypeInfo[] = [
  {
    id: 'dog',
    icon: '🐶',
    name: 'Dog',
    cost: 5000,
  },
  {
    id: 'cat',
    icon: '🐱',
    name: 'Cat',
    cost: 5000,
  },
  {
    id: 'rabbit',
    icon: '🐰',
    name: 'Rabbit',
    cost: 7500,
  },
  {
    id: 'parrot',
    icon: '🦜',
    name: 'Parrot',
    cost: 10000,
  },
  {
    id: 'fox',
    icon: '🦊',
    name: 'Fox',
    cost: 15000,
  },
  {
    id: 'fish',
    icon: '🐟',
    name: 'Fish',
    cost: 2500,
  },
  {
    id: 'chicken',
    icon: '🐔',
    name: 'Chicken',
    cost: 3750,
  },
  {
    id: 'turtle',
    icon: '🐢',
    name: 'Turtle',
    cost: 6000,
  },
  {
    id: 'hamster',
    icon: '🐹',
    name: 'Hamster',
    cost: 4000,
  },
  {
    id: 'otter',
    icon: '🦦',
    name: 'Otter',
    cost: 12500,
  },
];
