import type { ActionCard, CheatCard } from './cards';
import { Position } from './position';

export type Move = {
  positions: Position[];
  playedActionCard?: ActionCard;
  playedCheatCard?: CheatCard;
};
