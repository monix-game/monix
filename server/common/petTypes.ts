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
    cost: 100,
  },
  {
    id: 'cat',
    icon: '🐱',
    name: 'Cat',
    cost: 100,
  },
  {
    id: 'rabbit',
    icon: '🐰',
    name: 'Rabbit',
    cost: 150,
  },
  {
    id: 'parrot',
    icon: '🦜',
    name: 'Parrot',
    cost: 200,
  },
  {
    id: 'fox',
    icon: '🦊',
    name: 'Fox',
    cost: 300,
  },
  {
    id: 'fish',
    icon: '🐟',
    name: 'Fish',
    cost: 50,
  },
  {
    id: 'chicken',
    icon: '🐔',
    name: 'Chicken',
    cost: 75,
  },
  {
    id: 'turtle',
    icon: '🐢',
    name: 'Turtle',
    cost: 120,
  },
  {
    id: 'hamster',
    icon: '🐹',
    name: 'Hamster',
    cost: 80,
  },
  {
    id: 'otter',
    icon: '🦦',
    name: 'Otter',
    cost: 250,
  },
];
