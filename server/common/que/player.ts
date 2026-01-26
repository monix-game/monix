import type { Card, DefenseCard } from './cards';
import { Game } from './game';
import type { Move } from './move';

export type Player = {
  type: 'red' | 'blue';
  cards: Card[];
  activeDefenseCard?: DefenseCard;
  playMove(game: Game, player: Player): Promise<Move> | Move;
};

export const playDefenseCard = (player: Player, card: DefenseCard): void => {
  player.activeDefenseCard = card;
  // Remove 1 of the defense card from the player's cards
  const cardIndex = player.cards.findIndex(c => c.id === card.id);
  if (cardIndex !== -1) {
    player.cards.splice(cardIndex, 1);
  }
};
