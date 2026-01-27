import type { Move } from './move';
import type { Piece } from './piece';
import { Position } from './position';

export class Board {
  board: (Piece | null)[];
  rows: number = 8;
  cols: number = 8;

  constructor() {
    this.board = [];

    this.reset();
  }

  reset(): void {
    this.board = Array.from({ length: this.rows * this.cols }, () => null);
  }

  clone(): Board {
    const newBoard = new Board();
    newBoard.board = this.board.slice();
    return newBoard;
  }

  positionFilled(pos: Position): boolean {
    if (!this.isValidPosition(pos)) {
      throw new Error('Invalid position');
    }
    return this.board[pos.row * this.cols + pos.col] !== null;
  }

  placePiece(piece: Piece | null, pos: Position): void {
    if (!this.isValidPosition(pos)) {
      throw new Error('Invalid position');
    }
    this.board[pos.row * this.cols + pos.col] = piece;
  }

  getPieceAt(pos: Position): Piece | null {
    if (!this.isValidPosition(pos)) {
      throw new Error('Invalid position');
    }
    return this.board[pos.row * this.cols + pos.col] ?? null;
  }

  getBlockPieces(startPos: Position): (Piece | null)[] {
    const pieces: (Piece | null)[] = [];
    for (let r = startPos.row; r < startPos.row + 3; r++) {
      for (let c = startPos.col; c < startPos.col + 3; c++) {
        if (this.isValidPosition({ row: r, col: c })) {
          pieces.push(this.getPieceAt({ row: r, col: c }));
        }
      }
    }
    return pieces;
  }

  getValidMoves(): Move[] {
    const validMoves: Move[] = [];
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        if (this.isValidMove({ positions: [{ row, col }] })) {
          validMoves.push({ positions: [{ row, col }] });
        }
      }
    }
    return validMoves;
  }

  isValidPosition(pos: Position): boolean {
    return pos.row >= 0 && pos.row < this.rows && pos.col >= 0 && pos.col < this.cols;
  }

  isValidMove(move: Move): boolean {
    if (!this.isValidPosition(move.positions[0])) {
      return false;
    }

    if (this.positionFilled(move.positions[0])) {
      return false;
    }

    // Cheat card "Telekinesis" allows any move
    if (move.playedCheatCard && move.playedCheatCard.id === 'telekinesis') {
      return true;
    }

    // Move rules: Must be adjacent (including diagonals) to an existing piece
    if (this.board.every(piece => piece === null)) {
      // If board is empty, any move is valid
      return true;
    }

    const directions = [
      [-1, -1],
      [-1, 0],
      [-1, 1],
      [0, -1],
      [0, 1],
      [1, -1],
      [1, 0],
      [1, 1],
    ];

    for (const [dRow, dCol] of directions) {
      const newRow = move.positions[0].row + dRow;
      const newCol = move.positions[0].col + dCol;
      if (
        this.isValidPosition({ row: newRow, col: newCol }) &&
        this.positionFilled({ row: newRow, col: newCol })
      ) {
        return true;
      }
    }

    return false;
  }
}
