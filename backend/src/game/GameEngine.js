/**
 * GameEngine.js - Core game loop and state management
 */

const Deck = require('./Deck');
const Player = require('./Player');
const { isTruthful, calculateScoreChange, shouldEnterTiebreak, getActivePlayers, getWinner } = require('./rules');
const logger = require('../utils/logger');
const { cardIndices: isValidCardIndices } = require('../utils/validate');

class GameEngine {
  constructor(players, settings = {}) {
    this.players = players; // Array of Player objects
    this.roundNumber = 0;
    this.winningCard = null;
    this.currentPlayerIndex = 0;
    this.turnOrder = [];
    this.playHistory = []; // { playerId, playerName, cardsPlayed: N, claim: "3 Kings" }
    this.roundPlays = {}; // { playerId: { cardsPlayed[], truthful: bool } }
    this.deck = null;
    this.settings = {
      mode: settings.mode || 'standard', // standard | short | timed
      scoreThreshold: settings.mode === 'short' ? 10 : 20,
      timedMinutes: settings.timedMinutes || null,
    };
    this.timedThreshold = null; // set when timer fires
    this.bonus = 0; // shared bonus pot (SPEC §1.6)
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
    const threshold = this.timedThreshold ?? this.settings.scoreThreshold;
    const activePlayers = getActivePlayers(this.players, threshold);
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

    if (player.spectator) {
      return { success: false, message: 'Spectators cannot play' };
    }

    if (playerId !== this.turnOrder[this.currentPlayerIndex]) {
      return { success: false, message: 'Not your turn' };
    }

    if (!isValidCardIndices(cardsPlayed, player.hand.length)) {
      return { success: false, message: 'Invalid card selection' };
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

    if (caller.spectator) {
      return { success: false, message: 'Spectators cannot call liar' };
    }

    // Only the current player (the one after the accused) may call liar
    if (callerId !== this.turnOrder[this.currentPlayerIndex]) {
      return { success: false, message: 'Not your turn' };
    }

    const play = this.roundPlays[accusedId];
    if (!play) {
      return { success: false, message: 'No play to call liar on' };
    }

    const isLiarCorrect = !play.truthful;
    const bonusPaid = isLiarCorrect ? this.bonus : 0;
    const scoreChange = calculateScoreChange(isLiarCorrect, this.bonus);

    // Record the actual change per player (scores are clamped at 0)
    const scoreDeltas = {};
    const applyScore = (p, delta) => {
      const before = p.mainScore;
      p.updateScore(delta);
      if (p.mainScore !== before) scoreDeltas[p.id] = p.mainScore - before;
    };

    applyScore(accusedPlayer, scoreChange.liarScore);
    applyScore(caller, scoreChange.callerScore);
    this.players.forEach(p => {
      if (p.id !== accusedId && p.id !== callerId && !p.spectator) {
        applyScore(p, scoreChange.othersScore);
      }
    });

    this.bonus = Math.max(0, this.bonus - 1);

    logger.log(`Liar call by ${caller.name} on ${accusedPlayer.name}: ${isLiarCorrect ? 'CORRECT' : 'WRONG'}`);

    return {
      success: true,
      message: 'Liar call resolved',
      result: {
        truthful: play.truthful,
        isLiarCorrect,
        cardsPlayed: play.cardsPlayed,
        accusedId,
        callerId,
        bonusPaid,
        scoreDeltas
      }
    };
  }

  /**
   * Resolve a round where all players played out their cards with no liar call.
   * All active players gain +1 point; the shared bonus pot grows by 1.
   * @returns {Object<string, number>} scoreDeltas
   */
  resolveNoLiarCall() {
    const scoreDeltas = {};
    this.players.filter(p => !p.spectator).forEach(p => {
      p.updateScore(1);
      scoreDeltas[p.id] = 1;
    });
    this.bonus++;
    logger.log(`Round resolved: no liar call — all players +1 pt, bonus pot now ${this.bonus}`);
    return scoreDeltas;
  }

  /**
   * Remove a player mid-game (grace period expired or left) — SPEC §2.1.
   * They become a spectator and keep their score. The current turn stays with the
   * same player, or passes to the next player holding cards if the removed player
   * was current.
   * @param {string} playerId
   */
  removePlayer(playerId) {
    const player = this.players.find(p => p.id === playerId);
    if (player) {
      player.spectator = true;
      player.left = true;
    }
    const idx = this.turnOrder.indexOf(playerId);
    if (idx === -1) return;

    const wasCurrent = idx === this.currentPlayerIndex;
    this.turnOrder.splice(idx, 1);
    if (idx < this.currentPlayerIndex) this.currentPlayerIndex--;
    if (this.currentPlayerIndex >= this.turnOrder.length) this.currentPlayerIndex = 0;

    // After the splice the index already points at the following player
    if (wasCurrent && this.turnOrder.length > 0 && !this.currentHasCards()) {
      this.nextTurn();
    }
  }

  /**
   * Bring a removed player back (rejoin after grace period). They sit out the
   * current round and are dealt in from the next one, like a mid-game join.
   */
  restorePlayer(playerId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player || !player.left) return;
    player.left = false;
    player.clearHand();
    // In a tiebreak only the top scorers play; everyone else keeps watching
    const threshold = this.timedThreshold ?? this.settings.scoreThreshold;
    const tiebreak = this.timedThreshold !== null || shouldEnterTiebreak(this.players, threshold);
    player.spectator = tiebreak && !getActivePlayers(this.players, threshold).includes(player);
  }

  currentHasCards() {
    const current = this.players.find(p => p.id === this.turnOrder[this.currentPlayerIndex]);
    return !!current && current.hand.length > 0;
  }

  /** True when no active player holds cards (round over without a liar call). */
  allHandsEmpty() {
    return this.players.filter(p => !p.spectator).every(p => p.hand.length === 0);
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
    // Timed game: skip score-based win until timer fires and sets timedThreshold
    if (this.settings.mode === 'timed' && this.timedThreshold === null) return null;

    const threshold = this.timedThreshold ?? this.settings.scoreThreshold;
    if (shouldEnterTiebreak(this.players, threshold)) {
      const activePlayers = getActivePlayers(this.players, threshold);
      activePlayers.forEach(p => { p.spectator = false; });
      this.players.filter(p => !activePlayers.includes(p)).forEach(p => { p.spectator = true; });
      return getWinner(this.players, threshold);
    }
    return null;
  }

  /**
   * Resolve a timed game when the countdown expires.
   * Spectates non-leaders, sets timedThreshold to enable tiebreak logic.
   * @returns {{ winner: Player|null }} winner if solo leader, null if tiebreak needed
   */
  resolveTimedGame() {
    const maxScore = Math.max(...this.players.map(p => p.mainScore));
    this.timedThreshold = maxScore;

    const leaders = this.players.filter(p => p.mainScore === maxScore);
    this.players.forEach(p => { p.spectator = p.mainScore < maxScore; });

    if (leaders.length === 1) {
      return { winner: leaders[0] };
    }
    // Tiebreak: multiple players tied — continue game with these players only
    return { winner: null };
  }

  /**
   * Get full game state for clients
   */
  getGameState() {
    return {
      roundNumber: this.roundNumber,
      bonus: this.bonus,
      winningCard: this.winningCard,
      currentPlayerId: this.turnOrder[this.currentPlayerIndex],
      players: this.players.map(p => p.getState()),
      playHistory: this.playHistory,
      turnOrder: this.turnOrder,
      settings: this.settings,
    };
  }
}

module.exports = GameEngine;
