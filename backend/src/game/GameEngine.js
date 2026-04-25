/**
 * GameEngine.js - Core game loop and state management
 */

const Deck = require('./Deck');
const Player = require('./Player');
const { isTruthful, calculateScoreChange, shouldEnterTiebreak, getActivePlayers, getWinner } = require('./rules');
const logger = require('../utils/logger');

class GameEngine {
  constructor(players) {
    this.players = players; // Array of Player objects
    this.roundNumber = 0;
    this.winningCard = null;
    this.currentPlayerIndex = 0;
    this.turnOrder = [];
    this.playHistory = []; // { playerId, playerName, cardsPlayed: N, claim: "3 Kings" }
    this.roundPlays = {}; // { playerId: { cardsPlayed[], truthful: bool } }
    this.deck = null;
  }

  /**
   * Start a new round
   * - Shuffle deck, pick winning card, deal 5 cards each, randomize turn order
   */
  startRound() {
    logger.log(`Starting round ${this.roundNumber + 1}`);

    this.roundNumber++;
    this.deck = new Deck();
    this.deck.shuffle();

    // Pick winning card (1-3, not Joker)
    this.winningCard = [1, 2, 3][Math.floor(Math.random() * 3)];
    logger.log(`Winning card: ${Deck.getCardName(this.winningCard)}`);

    // Clear hands and deal 5 cards to each active player
    const activePlayers = getActivePlayers(this.players);
    activePlayers.forEach(player => {
      player.clearHand();
      player.cardsPlayedCount = 0;
      const dealtCards = this.deck.deal(5);
      player.addCards(dealtCards);
    });

    // Randomize turn order for active players
    this.turnOrder = activePlayers.map(p => p.id).sort(() => Math.random() - 0.5);
    this.currentPlayerIndex = 0;

    this.roundPlays = {};
    this.playHistory = [];
  }

  /**
   * Register a play from current player
   * @param {string} playerId
   * @param {number[]} cardsPlayed - Card indices to play
   * @returns {{ success: boolean, message: string }}
   */
  playTurn(playerId, cardsPlayed) {
    if (!Array.isArray(cardsPlayed) || cardsPlayed.length === 0 || cardsPlayed.length > 3) {
      return { success: false, message: 'Must play 1-3 cards' };
    }

    const player = this.players.find(p => p.id === playerId);
    if (!player) {
      return { success: false, message: 'Player not found' };
    }

    if (playerId !== this.turnOrder[this.currentPlayerIndex]) {
      return { success: false, message: 'Not your turn' };
    }

    try {
      const playedCards = player.removeCards(cardsPlayed);
      player.cardsPlayedCount = playedCards.length;

      // Auto-claim: all played cards are of winning card type
      const truthful = isTruthful(playedCards, this.winningCard);

      this.roundPlays[playerId] = {
        cardsPlayed: playedCards,
        truthful
      };

      const claimName = `${playedCards.length} ${Deck.getCardName(this.winningCard)}${playedCards.length > 1 ? 's' : ''}`;
      this.playHistory.push({
        playerId,
        playerName: player.name,
        cardsPlayed: playedCards.length,
        claim: claimName,
        tag: ''
      });

      logger.log(`${player.name} played ${claimName}`);
      return { success: true, message: 'Play registered' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Call liar on the current player
   * @param {string} callerId - ID of player calling liar
   * @returns {{ success: boolean, message: string, result?: object }}
   */
  callLiar(callerId) {
    if (callerId === this.turnOrder[this.currentPlayerIndex]) {
      return { success: false, message: 'Cannot call liar on yourself' };
    }

    const currentPlayerId = this.turnOrder[this.currentPlayerIndex];
    const currentPlayer = this.players.find(p => p.id === currentPlayerId);
    const caller = this.players.find(p => p.id === callerId);

    if (!currentPlayer || !caller) {
      return { success: false, message: 'Player not found' };
    }

    const play = this.roundPlays[currentPlayerId];
    if (!play) {
      return { success: false, message: 'No play to call liar on' };
    }

    const isLiarCorrect = !play.truthful;
    const scoreChange = calculateScoreChange(isLiarCorrect, currentPlayer.bonusModifier);

    // Apply score changes
    currentPlayer.updateScore(scoreChange.liarScore);
    caller.updateScore(scoreChange.callerScore);

    // Update bonus modifier
    const newBonus = isLiarCorrect ? 0 : Math.max(0, currentPlayer.bonusModifier - 1);
    currentPlayer.updateBonusModifier(newBonus - currentPlayer.bonusModifier);

    // Other players also gain points
    this.players.forEach(p => {
      if (p.id !== currentPlayerId && p.id !== callerId && !p.spectator) {
        p.updateScore(scoreChange.othersScore);
      }
    });

    logger.log(`Liar call: ${isLiarCorrect ? 'CORRECT' : 'WRONG'}`);

    return {
      success: true,
      message: 'Liar call resolved',
      result: {
        truthful: play.truthful,
        isLiarCorrect,
        cardsPlayed: play.cardsPlayed,
        scoreDeltas: {
          [currentPlayerId]: scoreChange.liarScore,
          [callerId]: scoreChange.callerScore
        }
      }
    };
  }

  /**
   * Remove a player mid-game (disconnect timeout)
   * @param {string} playerId
   */
  removePlayer(playerId) {
    const player = this.players.find(p => p.id === playerId);
    if (player) player.spectator = true;
    this.turnOrder = this.turnOrder.filter(id => id !== playerId);
    if (this.currentPlayerIndex >= this.turnOrder.length) {
      this.currentPlayerIndex = 0;
    }
  }

  /**
   * Advance to next player's turn
   */
  nextTurn() {
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.turnOrder.length;
  }

  /**
   * Check if game victory condition is met
   * @returns {Player|null}
   */
  isVictoryConditionMet() {
    if (shouldEnterTiebreak(this.players)) {
      const activePlayers = getActivePlayers(this.players);
      activePlayers.forEach(p => {
        p.spectator = false;
      });
      this.players.filter(p => !activePlayers.includes(p)).forEach(p => {
        p.spectator = true;
      });

      return getWinner(this.players);
    }
    return null;
  }

  /**
   * Get full game state for clients
   */
  getGameState() {
    return {
      roundNumber: this.roundNumber,
      winningCard: this.winningCard,
      currentPlayerId: this.turnOrder[this.currentPlayerIndex],
      players: this.players.map(p => p.getState()),
      playHistory: this.playHistory,
      turnOrder: this.turnOrder
    };
  }
}

module.exports = GameEngine;
