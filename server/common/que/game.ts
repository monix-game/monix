import { Board } from './board';
import type { DefenseCard } from './cards';
import { createDeck } from './deck';
import { Move } from './move';
import type { Player } from './player';
import { UI } from './ui';

export type GameState = 'ongoing' | 'red-won' | 'blue-won' | 'tie';

export class Game {
  board: Board;
  redPlayer: Player;
  bluePlayer: Player;
  currentPlayer: 'red' | 'blue' = 'red';
  piecesPerPlayer: number = 25;
  state: GameState = 'ongoing';
  turnsPlayed: number = 0;
  redPlayerIncorrectWipeoutStreak: number = 0;
  bluePlayerIncorrectWipeoutStreak: number = 0;
  ui: UI;

  constructor(redPlayer: Player, bluePlayer: Player, ui: UI) {
    this.board = new Board();
    this.redPlayer = redPlayer;
    this.bluePlayer = bluePlayer;
    this.ui = ui;

    // Create decks
    this.redPlayer.cards = createDeck();
    this.bluePlayer.cards = createDeck();
  }

  private isValidWipeoutBlock(startRow: number, startCol: number): boolean {
    // Check if the 3x3 block starting at (startRow, startCol) is valid and all positions are filled
    if (
      !this.board.isValidPosition({ row: startRow, col: startCol }) ||
      !this.board.isValidPosition({ row: startRow + 2, col: startCol + 2 })
    ) {
      return false;
    }

    for (let r = startRow; r <= startRow + 2; r++) {
      for (let c = startCol; c <= startCol + 2; c++) {
        if (!this.board.positionFilled({ row: r, col: c })) {
          return false;
        }
      }
    }
    return true;
  }

  private clearWipeoutBlock(startRow: number, startCol: number): Set<'red' | 'blue'> {
    // Clear all pieces in the 3x3 block, respecting Splash Zone defense cards
    const protectedPlayers = new Set<'red' | 'blue'>();

    for (let r = startRow; r <= startRow + 2; r++) {
      for (let c = startCol; c <= startCol + 2; c++) {
        const piece = this.board.getPieceAt({ row: r, col: c });
        if (piece) {
          const owningPlayer = piece.player === 'red' ? this.redPlayer : this.bluePlayer;
          if (owningPlayer.activeDefenseCard?.id === 'splash-zone') {
            protectedPlayers.add(owningPlayer.type);
            continue;
          }
        }
        this.board.placePiece(null, { row: r, col: c });
      }
    }

    return protectedPlayers;
  }

  private calculatePieceLosses(
    player: Player,
    playerPiecesBefore: number,
    opponentPiecesBefore: number
  ): { playerLost: number; opponentLost: number } {
    const playerPiecesAfter = this.board.board.filter(p => p?.player === player.type).length;
    const opponentPiecesAfter = this.board.board.filter(
      p => p?.player === (player.type === 'red' ? 'blue' : 'red')
    ).length;

    return {
      playerLost: playerPiecesBefore - playerPiecesAfter,
      opponentLost: opponentPiecesBefore - opponentPiecesAfter,
    };
  }

  private handleWipeoutStreaks(player: Player, playerLost: number, opponentLost: number): void {
    // Update incorrect wipeout streak if player lost more pieces
    if (playerLost > opponentLost) {
      if (player.type === 'red') {
        this.redPlayerIncorrectWipeoutStreak++;
      } else {
        this.bluePlayerIncorrectWipeoutStreak++;
      }
    }
  }

  private deactivateDefenseCards(
    player: Player,
    playerLost: number,
    opponentLost: number,
    protectedPlayers: Set<'red' | 'blue'>
  ): void {
    // Remove Splash Zone defense cards if they protected pieces that were cleared
    const opponent = player.type === 'red' ? this.bluePlayer : this.redPlayer;

    const playerSplashActive = player.activeDefenseCard?.id === 'splash-zone';
    const opponentSplashActive = opponent.activeDefenseCard?.id === 'splash-zone';

    if ((playerLost > 0 || protectedPlayers.has(player.type)) && playerSplashActive) {
      this.ui.announce(
        `${player.type.toUpperCase()} player's Splash Zone defense card has been deactivated!`
      );
      player.activeDefenseCard = undefined;
    }
    if ((opponentLost > 0 || protectedPlayers.has(opponent.type)) && opponentSplashActive) {
      this.ui.announce(
        `${opponent.type.toUpperCase()} player's Splash Zone defense card has been deactivated!`
      );
      opponent.activeDefenseCard = undefined;
    }
  }

  checkAndHandleWipeout(row: number, col: number, player: Player): void {
    // Check all possible 3x3 blocks that include (row, col)
    const startRows = [row - 2, row - 1, row];
    const startCols = [col - 2, col - 1, col];

    const opponent = player.type === 'red' ? this.bluePlayer : this.redPlayer;
    const playerPiecesBefore = this.board.board.filter(p => p?.player === player.type).length;
    const opponentPiecesBefore = this.board.board.filter(p => p?.player === opponent.type).length;

    for (const startRow of startRows) {
      for (const startCol of startCols) {
        if (this.isValidWipeoutBlock(startRow, startCol)) {
          const protectedPlayers = this.clearWipeoutBlock(startRow, startCol);

          const { playerLost, opponentLost } = this.calculatePieceLosses(
            player,
            playerPiecesBefore,
            opponentPiecesBefore
          );

          this.handleWipeoutStreaks(player, playerLost, opponentLost);
          this.deactivateDefenseCards(player, playerLost, opponentLost, protectedPlayers);
        }
      }
    }
  }

  checkIfGameOver(): void {
    const redOnBoard = this.board.board.filter(piece => piece?.player === 'red').length;
    const blueOnBoard = this.board.board.filter(piece => piece?.player === 'blue').length;

    // Check if any players have 25 pieces on the board
    if (redOnBoard === this.piecesPerPlayer && blueOnBoard === this.piecesPerPlayer) {
      this.state = 'tie';
      return;
    }

    if (redOnBoard === this.piecesPerPlayer) {
      this.state = 'red-won';
      return;
    }
    if (blueOnBoard === this.piecesPerPlayer) {
      this.state = 'blue-won';
      return;
    }
    this.state = 'ongoing';
  }

  tick(): void {
    if (this.state !== 'ongoing') {
      return;
    }
    const currentPlayer = this.currentPlayer === 'red' ? this.redPlayer : this.bluePlayer;

    // Check if the current player has a wipeout streak of 3
    const currentStreak =
      currentPlayer.type === 'red'
        ? this.redPlayerIncorrectWipeoutStreak
        : this.bluePlayerIncorrectWipeoutStreak;
    if (currentStreak >= 3) {
      // Opponent wins
      this.ui.announce(
        `${currentPlayer.type.toUpperCase()} player has an incorrect wipeout streak of 3! ${currentPlayer.type === 'red' ? 'BLUE' : 'RED'} wins!`
      );
      this.state = currentPlayer.type === 'red' ? 'blue-won' : 'red-won';
      return;
    }

    // Check if it has been more than 250 turns
    if (this.turnsPlayed >= 250) {
      this.state = 'tie';
    }
  }

  handleActionCard(move: Move, player: Player): void {
    if (move.playedActionCard) {
      this.ui.announce(
        `${player.type.toUpperCase()} player played action card: ${move.playedActionCard.name}`
      );

      // Figure out if any defense card is active for the current player
      let defenseCard: DefenseCard | undefined = undefined;
      if (
        player.activeDefenseCard &&
        player.activeDefenseCard.defendedAgainst?.some(
          card => card.id === move.playedActionCard!.id
        )
      ) {
        defenseCard = player.activeDefenseCard;
        player.activeDefenseCard = undefined;
        this.ui.announce(
          `${player.type.toUpperCase()} player's ${defenseCard.name} defense card has been used to block the action card!`
        );
      }
      move.playedActionCard.execute(move.positions[0], this.board, player, defenseCard);

      // Remove action card from player's cards
      const actionCardIndex = player.cards.findIndex(c => c.id === move.playedActionCard!.id);
      if (actionCardIndex !== -1) {
        player.cards.splice(actionCardIndex, 1);
      }
    }
  }

  handleCheatCard(move: Move, player: Player): void {
    if (move.playedCheatCard) {
      this.ui.announce(
        `${player.type.toUpperCase()} player played cheat card: ${move.playedCheatCard.name}`
      );

      // Remove cheat card from player's cards
      const cheatCardIndex = player.cards.findIndex(c => c.id === move.playedCheatCard!.id);
      if (cheatCardIndex !== -1) {
        player.cards.splice(cheatCardIndex, 1);
      }
    }
  }

  executeMove(move: Move): void {
    this.tick();

    const player = this.currentPlayer === 'red' ? this.redPlayer : this.bluePlayer;

    if (this.board.isValidMove(move)) {
      // Place the piece on the board
      for (const pos of move.positions) {
        this.board.placePiece({ player: player.type }, pos);
      }

      // Handle action card if played
      this.handleActionCard(move, player);
      // Handle cheat card if played
      this.handleCheatCard(move, player);

      // Handle wipeout for each placed position
      for (const pos of move.positions) {
        this.checkAndHandleWipeout(pos.row, pos.col, player);
      }

      this.turnsPlayed++;

      this.ui.announce(
        `Turn ${this.turnsPlayed}: ${this.currentPlayer === 'red' ? 'Blue' : 'Red'} played`
      );

      // Check if the game is over
      this.checkIfGameOver();

      // Switch to the next player if the game is still ongoing
      if (this.state === 'ongoing') {
        this.currentPlayer = this.currentPlayer === 'red' ? 'blue' : 'red';
      }
    }
  }
}
