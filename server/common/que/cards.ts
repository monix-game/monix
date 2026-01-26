import type { Board } from './board';
import type { Player } from './player';
import { Position } from './position';

export type Card = {
  id: string;
  name: string;
  description: string;
  type: 'action' | 'cheat' | 'defense';
};

export type ActionCard = {
  type: 'action';
  execute: (target: Position, board: Board, piecePlayer: Player, defense?: DefenseCard) => void;
} & Card;

export type CheatCard = {
  type: 'cheat';
} & Card;

export type DefenseCard = {
  type: 'defense';
  defendedAgainst?: ActionCard[];
} & Card;

export const actionCards: ActionCard[] = [
  {
    id: 'bomb',
    name: 'Bomb',
    description: "Removes a 3x3 area of your opponent's pieces centered on the target position.",
    type: 'action',
    execute: (target: Position, board: Board, piecePlayer: Player, defense?: DefenseCard): void => {
      const piecesToRemove: { row: number; col: number }[] = [];
      for (let r = target.row - 1; r <= target.row + 1; r++) {
        for (let c = target.col - 1; c <= target.col + 1; c++) {
          if (board.isValidPosition({ row: r, col: c }) && board.positionFilled({ row: r, col: c })) {
            piecesToRemove.push({ row: r, col: c });
          }
        }
      }

      piecesToRemove.forEach(({ row, col }) => {
        const piece = board.getPieceAt({ row, col });

        if (piece && piece.player === piecePlayer.type) {
          return; // Skip removing own pieces
        }

        if (defense && defense.id === 'armoured-pieces') {
          if (piece && piece.player !== piecePlayer.type) {
            return; // Opponent's piece is protected
          }
        }

        board.placePiece(null, { row, col });
      });
    },
  },
  {
    id: 'hammer',
    name: 'Hammer',
    description: "Removes your opponent's pieces 3 squares in the four orthogonal directions from the target position.",
    type: 'action',
    execute: (target: Position, board: Board, piecePlayer: Player, defense?: DefenseCard): void => {
      const directions = [
        { dr: -1, dc: 0 }, // Up
        { dr: 1, dc: 0 }, // Down
        { dr: 0, dc: -1 }, // Left
        { dr: 0, dc: 1 }, // Right
      ];

      directions.forEach(({ dr, dc }) => {
        for (let i = 1; i <= 3; i++) {
          const r = target.row + dr * i;
          const c = target.col + dc * i;

          if (!board.isValidPosition({ row: r, col: c }) || !board.positionFilled({ row: r, col: c })) {
            break; // Stop if out of bounds or no piece
          }

          const piece = board.getPieceAt({ row: r, col: c });

          if (piece && piece.player === piecePlayer.type) {
            break; // Stop if own piece encountered
          }

          if (defense && defense.id === 'armoured-pieces') {
            if (piece && piece.player !== piecePlayer.type) {
              break; // Opponent's piece is protected
            }
          }

          board.placePiece(null, { row: r, col: c });
        }
      });
    },
  },
  {
    id: 'splinter',
    name: 'Splinter',
    description: "Removes your opponent's pieces 3 squares in the four diagonal directions from the target position.",
    type: 'action',
    execute: (target: Position, board: Board, piecePlayer: Player, defense?: DefenseCard): void => {
      const directions = [
        { dr: -1, dc: -1 }, // Top-left
        { dr: -1, dc: 1 }, // Top-right
        { dr: 1, dc: -1 }, // Bottom-left
        { dr: 1, dc: 1 }, // Bottom-right
      ];

      directions.forEach(({ dr, dc }) => {
        const r = target.row + dr * 3;
        const c = target.col + dc * 3;

        if (!board.isValidPosition({ row: r, col: c }) || !board.positionFilled({ row: r, col: c })) {
          return; // Skip if out of bounds or no piece
        }

        const piece = board.getPieceAt({ row: r, col: c });

        if (piece && piece.player === piecePlayer.type) {
          return; // Skip own pieces
        }

        if (defense && defense.id === 'armoured-pieces') {
          if (piece && piece.player !== piecePlayer.type) {
            return; // Opponent's piece is protected
          }
        }

        board.placePiece(null, { row: r, col: c });
      });
    },
  },
];

export const cheatCards: CheatCard[] = [
  {
    id: 'telekinesis',
    name: 'Telekinesis',
    description: 'You do not need to follow normal placement rules for this turn.',
    type: 'cheat',
  },
  {
    id: 'backup',
    name: 'Backup',
    description: 'You can place an additional piece this turn.',
    type: 'cheat',
  },
];

export const defenseCards: DefenseCard[] = [
  {
    id: 'armoured-pieces',
    name: 'Armoured Pieces',
    description: 'The action card you use this against cannot remove your pieces.',
    type: 'defense',
    defendedAgainst: actionCards.filter((card) => ['bomb', 'hammer', 'splinter'].includes(card.id)) as ActionCard[],
  },
  {
    id: 'splash-zone',
    name: 'Splash Zone',
    description: 'The wipeout you use this against cannot remove your pieces.',
    type: 'defense',
  },
];
