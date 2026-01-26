import { actionCards, Card, cheatCards, defenseCards } from './cards';

export const createDeck = (): Card[] => {
  const deck: Card[] = [];

  const bomb = actionCards.find((card) => card.id === 'bomb')!;
  for (let i = 0; i < 3; i++) {
    deck.push(bomb);
  }

  const hammer = actionCards.find((card) => card.id === 'hammer')!;
  deck.push(hammer);

  const splinter = actionCards.find((card) => card.id === 'splinter')!;
  deck.push(splinter);

  const telekinesis = cheatCards.find((card) => card.id === 'telekinesis')!;
  deck.push(telekinesis);

  const backup = cheatCards.find((card) => card.id === 'backup')!;
  deck.push(backup);

  const armouredPieces = defenseCards.find((card) => card.id === 'armoured-pieces')!;
  deck.push(armouredPieces);

  const splashZone = defenseCards.find((card) => card.id === 'splash-zone')!;
  deck.push(splashZone);

  return deck;
};
