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
    cost: 1000,
  },
  {
    id: 'cat',
    icon: '🐱',
    name: 'Cat',
    cost: 1000,
  },
  {
    id: 'rabbit',
    icon: '🐰',
    name: 'Rabbit',
    cost: 1500,
  },
  {
    id: 'parrot',
    icon: '🦜',
    name: 'Parrot',
    cost: 2000,
  },
  {
    id: 'fox',
    icon: '🦊',
    name: 'Fox',
    cost: 3000,
  },
  {
    id: 'fish',
    icon: '🐟',
    name: 'Fish',
    cost: 500,
  },
  {
    id: 'chicken',
    icon: '🐔',
    name: 'Chicken',
    cost: 750,
  },
  {
    id: 'turtle',
    icon: '🐢',
    name: 'Turtle',
    cost: 1200,
  },
  {
    id: 'hamster',
    icon: '🐹',
    name: 'Hamster',
    cost: 800,
  },
  {
    id: 'otter',
    icon: '🦦',
    name: 'Otter',
    cost: 2500,
  },
];
