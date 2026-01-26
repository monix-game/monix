import { Board } from './board';
import { ActionCard, CheatCard, DefenseCard } from './cards';
import { Game } from './game';
import type { Move } from './move';
import { Piece } from './piece';
import { playDefenseCard, type Player } from './player';
import { Position } from './position';

/**
 * Counts how many opponent pieces an action card would remove from a position
 */
const evaluateActionCard = (
  actionCard: ActionCard,
  pos: Position,
  board: Board,
  playerType: 'red' | 'blue'
): number => {
  const tempBoard = board.clone();
  const opponent = playerType === 'red' ? 'blue' : 'red';

  const piecesBefore = tempBoard.board.filter(p => p?.player === opponent).length;

  // Execute the action card on the temp board
  actionCard.execute(pos, tempBoard, { type: playerType } as Player);

  const piecesAfter = tempBoard.board.filter(p => p?.player === opponent).length;

  return piecesBefore - piecesAfter;
};

/**
 * Finds the best position and action card combo
 */
const findBestActionCardMove = (
  validMoves: Move[],
  player: Player,
  board: Board
): { move: Move; actionCard: ActionCard; value: number } | null => {
  const actionCards = player.cards.filter(card => card.type === 'action') as ActionCard[];

  if (actionCards.length === 0) {
    return null;
  }

  let bestMove: Move | null = null;
  let bestActionCard: ActionCard | null = null;
  let bestValue = 0;

  for (const card of actionCards) {
    for (const move of validMoves) {
      const value = evaluateActionCard(card, move.positions[0], board, player.type);

      // Prefer moves that remove more opponent pieces
      if (value > bestValue) {
        bestValue = value;
        bestMove = move;
        bestActionCard = card;
      }
    }
  }

  if (bestMove && bestActionCard && bestValue >= 2) {
    // Only use action card if it removes at least 2 pieces
    return { move: bestMove, actionCard: bestActionCard, value: bestValue };
  }

  return null;
};

/**
 * Evaluates if a move would cause a beneficial wipeout
 */
const evaluateWipeout = (
  move: Move,
  board: Board,
  playerType: 'red' | 'blue'
): { playerWipeouts: number; opponentWipeouts: number } => {
  const tempBoard = board.clone();
  tempBoard.placePiece({ player: playerType }, move.positions[0]);

  let playerWipeouts = 0;
  let opponentWipeouts = 0;

  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      const blockPieces = tempBoard.getBlockPieces({ row: r, col: c });
      const redCount = blockPieces.filter((p: Piece | null) => p?.player === 'red').length;
      const blueCount = blockPieces.filter((p: Piece | null) => p?.player === 'blue').length;

      if (redCount === 9) {
        if (playerType === 'red') {
          playerWipeouts += 9;
        } else {
          opponentWipeouts += 9;
        }
      } else if (blueCount === 9) {
        if (playerType === 'blue') {
          playerWipeouts += 9;
        } else {
          opponentWipeouts += 9;
        }
      }
    }
  }

  return { playerWipeouts, opponentWipeouts };
};

/**
 * Computes the max count of the player's pieces in any 3x3 block that includes `pos` after placing there.
 */
const blockPotentialForPosition = (
  pos: Position,
  board: Board,
  playerType: 'red' | 'blue'
): number => {
  const tempBoard = board.clone();
  tempBoard.placePiece({ player: playerType }, pos);

  let maxCount = 0;
  for (let r = pos.row - 2; r <= pos.row; r++) {
    for (let c = pos.col - 2; c <= pos.col; c++) {
      if (
        !tempBoard.isValidPosition({ row: r, col: c }) ||
        !tempBoard.isValidPosition({ row: r + 2, col: c + 2 })
      ) {
        continue;
      }
      const blockPieces = tempBoard.getBlockPieces({ row: r, col: c });
      const count = blockPieces.filter((p: Piece | null) => p?.player === playerType).length;
      if (count > maxCount) maxCount = count;
    }
  }
  return maxCount;
};

/**
 * Finds the best non-adjacent placement unlocked by Telekinesis, returning its score and potential.
 */
const findTelekinesisOpportunity = (
  player: Player,
  board: Board
): { pos: Position; tkScore: number; potential: number } | null => {
  const telekinesis = player.cards.find(card => card.id === 'telekinesis');
  if (!telekinesis) return null;

  let best: { pos: Position; tkScore: number; potential: number } | null = null;

  for (let row = 0; row < board.rows; row++) {
    for (let col = 0; col < board.cols; col++) {
      const pos = { row, col };
      if (board.positionFilled(pos)) continue;

      // Only consider positions that are currently invalid due to adjacency rule
      if (board.isValidMove({ positions: [pos] })) continue;

      const { playerWipeouts, opponentWipeouts } = evaluateWipeout(
        { positions: [pos] },
        board,
        player.type
      );
      const tkScore = opponentWipeouts - playerWipeouts;
      const potential = blockPotentialForPosition(pos, board, player.type);

      if (
        !best ||
        tkScore > best.tkScore ||
        (tkScore === best.tkScore && potential > best.potential)
      ) {
        best = { pos, tkScore, potential };
      }
    }
  }

  return best;
};
/**
 * Evaluates wipeout results when placing multiple pieces (for Backup card)
 */
const evaluateWipeoutForPositions = (
  positions: Position[],
  board: Board,
  playerType: 'red' | 'blue'
): { playerWipeouts: number; opponentWipeouts: number } => {
  const tempBoard = board.clone();
  for (const pos of positions) {
    tempBoard.placePiece({ player: playerType }, pos);
  }

  let playerWipeouts = 0;
  let opponentWipeouts = 0;

  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      const blockPieces = tempBoard.getBlockPieces({ row: r, col: c });
      const redCount = blockPieces.filter((p: Piece | null) => p?.player === 'red').length;
      const blueCount = blockPieces.filter((p: Piece | null) => p?.player === 'blue').length;

      if (redCount === 9) {
        if (playerType === 'red') {
          playerWipeouts += 9;
        } else {
          opponentWipeouts += 9;
        }
      } else if (blueCount === 9) {
        if (playerType === 'blue') {
          playerWipeouts += 9;
        } else {
          opponentWipeouts += 9;
        }
      }
    }
  }

  return { playerWipeouts, opponentWipeouts };
};

export const ai = (game: Game, player: Player): Move => {
  // If there isn't a defense card active, play one if available
  if (!player.activeDefenseCard) {
    const defenseCard = player.cards.find(card => card.type === 'defense');
    if (defenseCard) {
      playDefenseCard(player, defenseCard as DefenseCard);
    }
  }

  const validMoves = game.board.getValidMoves();

  // Evaluate all moves for wipeout potential
  const movesWithScores = validMoves.map(move => {
    const { playerWipeouts, opponentWipeouts } = evaluateWipeout(move, game.board, player.type);
    const score = opponentWipeouts - playerWipeouts; // Positive is good
    return { move, score, playerWipeouts, opponentWipeouts };
  });

  // Filter out moves that cause net negative wipeouts
  const safeMoves = movesWithScores.filter(m => m.playerWipeouts <= m.opponentWipeouts);
  const finalMoveOptions = safeMoves.length > 0 ? safeMoves : movesWithScores;

  if (finalMoveOptions.length === 0) {
    throw new Error(`${player.type} player has no valid moves!`);
  }

  // Establish the best single-placement baseline
  const bestSingle = finalMoveOptions.reduce(
    (best, m) => (m.score > best.score ? m : best),
    finalMoveOptions[0]
  );

  // Consider Telekinesis: use if it improves or builds strong potential when regular move is weak
  const tkCandidate = findTelekinesisOpportunity(player, game.board);
  if (tkCandidate) {
    const { pos, tkScore, potential } = tkCandidate;
    if (tkScore >= bestSingle.score || (bestSingle.score <= 0 && potential >= 5)) {
      const telekinesisIndex = player.cards.findIndex(c => c.id === 'telekinesis');
      if (telekinesisIndex !== -1) {
        const telekinesisCard = player.cards[telekinesisIndex] as CheatCard;
        return { positions: [pos], playedCheatCard: telekinesisCard };
      }
    }
  }

  // Consider using Backup card (place an extra piece) if it yields a better outcome
  const backupIdx = player.cards.findIndex(c => c.id === 'backup');
  if (backupIdx !== -1) {
    // Determine best single-move score
    const bestSingle = finalMoveOptions.reduce(
      (best, m) => (m.score > best.score ? m : best),
      finalMoveOptions[0]
    );

    let bestPair: {
      positions: Position[];
      score: number;
      playerWipeouts: number;
      opponentWipeouts: number;
    } | null = null;

    // Explore pairs among valid moves to find a superior combined outcome
    const candidateMoves = finalMoveOptions.map(m => m.move);
    for (let i = 0; i < candidateMoves.length; i++) {
      for (let j = i + 1; j < candidateMoves.length; j++) {
        const p1 = candidateMoves[i].positions[0];
        const p2 = candidateMoves[j].positions[0];
        // Avoid identical positions
        if (p1.row === p2.row && p1.col === p2.col) continue;

        const { playerWipeouts, opponentWipeouts } = evaluateWipeoutForPositions(
          [p1, p2],
          game.board,
          player.type
        );
        const combinedScore = opponentWipeouts - playerWipeouts;

        // Prefer non-negative outcomes and highest score
        if (playerWipeouts <= opponentWipeouts) {
          if (!bestPair || combinedScore > bestPair.score) {
            bestPair = {
              positions: [p1, p2],
              score: combinedScore,
              playerWipeouts,
              opponentWipeouts,
            };
          }
        }
      }
    }

    // Use Backup if combined result is better than single or likely triggers a wipeout
    if (
      bestPair &&
      (bestPair.score >= bestSingle.score ||
        (bestSingle.score <= 0 && bestPair.score >= 0) ||
        bestPair.opponentWipeouts >= 9)
    ) {
      const backupCard = player.cards[backupIdx] as CheatCard;
      return {
        positions: bestPair.positions,
        playedCheatCard: backupCard,
      };
    }
  }

  // Check if we should use an action card
  const bestActionCardOption = findBestActionCardMove(
    finalMoveOptions.map(m => m.move),
    player,
    game.board
  );

  if (bestActionCardOption && bestActionCardOption.value >= 3) {
    // Use action card if it removes 3+ pieces
    return {
      positions: bestActionCardOption.move.positions,
      playedActionCard: bestActionCardOption.actionCard,
    };
  }

  // Prioritize moves that trigger beneficial wipeouts
  const wipeoutMoves = finalMoveOptions.filter(m => m.opponentWipeouts > m.playerWipeouts);

  if (wipeoutMoves.length > 0) {
    // Pick the best wipeout move
    wipeoutMoves.sort((a, b) => b.score - a.score);
    return wipeoutMoves[0].move;
  }

  // Otherwise, pick a random safe move
  const choice = finalMoveOptions[Math.floor(Math.random() * finalMoveOptions.length)];
  return choice.move;
};
