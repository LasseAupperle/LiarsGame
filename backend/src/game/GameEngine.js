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
   * Call liar on the player who made the last play.
   * currentPlayerIndex is already advanced to the caller after nextTurn(),
   * so we identify the accused from playHistory — not from currentPlayerIndex.
   * @param {string} callerId - ID of player calling liar
   * @returns {{ success: boolean, message: string, result?: object }}
   */
  callLiar(callerId) {
    const lastPlay = this.playHistory[this.playHistory.length - 1];
    if (!lastPlay) {
      return { success: false, message: 'No play to call liar on' };
    }

    const accusedId = lastPlay.playerId;

    if (callerId === accusedId) {
      return { success: false, message: 'Cannot call liar on yourself' };
    }

    const accusedPlayer = this.players.find(p => p.id === accusedId);
    const caller = this.players.find(p => p.id === callerId);

    if (!accusedPlayer || !caller) {
      return { success: false, message: 'Player not found' };
    }

    const play = this.roundPlays[accusedId];
    if (!play) {
      return { success: false, message: 'No play to call liar on' };
    }

    const isLiarCorrect = !play.truthful;
    const scoreChange = calculateScoreChange(isLiarCorrect, accusedPlayer.bonusModifier);

    accusedPlayer.updateScore(scoreChange.liarScore);
    caller.updateScore(scoreChange.callerScore);

    const newBonus = isLiarCorrect ? 0 : Math.max(0, accusedPlayer.bonusModifier - 1);
    accusedPlayer.updateBonusModifier(newBonus - accusedPlayer.bonusModifier);

    this.players.forEach(p => {
      if (p.id !== accusedId && p.id !== callerId && !p.spectator) {
        p.updateScore(scoreChange.othersScore);
      }
    });

    logger.log(`Liar call by ${caller.name} on ${accusedPlayer.name}: ${isLiarCorrect ? 'CORRECT' : 'WRONG'}`);

    return {
      success: true,
      message: 'Liar call resolved',
      result: {
        truthful: play.truthful,
        isLiarCorrect,
        cardsPlayed: play.cardsPlayed,
        scoreDeltas: {
          [accusedId]: scoreChange.liarScore,
          [callerId]: scoreChange.callerScore
        }
      }
    };
  }

  /**
   * Resolve a round where all players played out their cards with no liar call.
   * All active players gain +1 point and +1 bonus modifier.
   */
  resolveNoLiarCall() {
    const active = this.players.filter(p => !p.spectator);
    active.forEach(p => {
      p.updateScore(1);
      p.updateBonusModifier(1);
    });
    logger.log('Round resolved: no liar call — all players +1 pt, bonus +1');
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
   * Advance to next player's turn, skipping players with empty hands.
   * The "all hands empty" check in gameEvents.js prevents infinite loops here.
   */
  nextTurn() {
    const total = this.turnOrder.length;
    for (let i = 0; i < total; i++) {
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % total;
      const current = this.players.find(p => p.id === this.turnOrder[this.currentPlayerIndex]);
      if (current && current.hand.length > 0) break;
    }
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
