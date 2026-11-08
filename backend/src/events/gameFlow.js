/**
 * gameFlow.js - Shared game progression used by lobby and game events:
 * round resolution, victory, disconnected-player auto-play and player removal.
 * See docs/SPEC.md §1 and §2.1.
 */

const sessionStore = require('../store/sessionStore');
const lobbyStore = require('../store/lobbyStore');
const presenceStore = require('../store/presenceStore');
const config = require('../config');
const logger = require('../utils/logger');
const BotBrain = require('../game/BotBrain');

const turnTimers = {};    // lobbyCode -> auto-play timeout
const gameTimers = {};    // lobbyCode -> timed-mode countdown
const finishedGames = {}; // lobbyCode -> { winner, expiresAt }

function unref(timer) {
  timer.unref?.();
  return timer;
}

async function emitPrivateHands(io, lobbyCode, gameEngine) {
  const sockets = await io.in(lobbyCode).fetchSockets();
  for (const s of sockets) {
    const player = gameEngine.players.find(p => p.id === s.data.playerId);
    if (player) s.emit('game:hand', player.hand);
  }
}

/** Broadcast state and (re)arm the auto-play timer for the current player. */
function broadcastState(io, lobbyCode, gameEngine) {
  const state = gameEngine.getGameState();
  io.to(lobbyCode).emit('game:state', state);
  scheduleTurn(io, lobbyCode, gameEngine);
  return state;
}

function clearTimers(lobbyCode) {
  clearTimeout(turnTimers[lobbyCode]);
  delete turnTimers[lobbyCode];
  clearTimeout(gameTimers[lobbyCode]);
  delete gameTimers[lobbyCode];
}

/** End the game, announce the winner (if any) and remember the result briefly. */
function endGame(io, lobbyCode, gameEngine, winner) {
  const result = winner
    ? { winnerId: winner.id, winnerName: winner.name, finalScore: winner.mainScore }
    : null;
  if (result) io.to(lobbyCode).emit('game:won', result);

  clearTimers(lobbyCode);
  gameEngine.players.forEach(p => presenceStore.clearGrace(p.id));
  finishedGames[lobbyCode] = { winner: result, expiresAt: Date.now() + config.FINISHED_GAME_TTL_MS };
  sessionStore.deleteSession(lobbyCode);
  lobbyStore.deleteLobby(lobbyCode);
}

/** Result of a recently finished game, for players rejoining late. */
function getFinishedGame(lobbyCode) {
  const entry = finishedGames[lobbyCode];
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    delete finishedGames[lobbyCode];
    return null;
  }
  return entry;
}

/** Check victory; otherwise deal a new round. Returns the new state, or null if the game ended. */
async function startNextRoundOrEnd(io, lobbyCode, gameEngine) {
  const winner = gameEngine.isVictoryConditionMet();
  if (winner) {
    endGame(io, lobbyCode, gameEngine, winner);
    return null;
  }
  gameEngine.startRound();
  lobbyStore.updateRoundNumber(lobbyCode, gameEngine.roundNumber);
  const state = broadcastState(io, lobbyCode, gameEngine);
  await emitPrivateHands(io, lobbyCode, gameEngine);
  return state;
}

/**
 * After a successful play: resolve a no-liar round if every hand is empty,
 * otherwise pass the turn. Returns the resulting state (null if the game ended).
 */
async function afterPlay(io, lobbyCode, gameEngine) {
  if (gameEngine.allHandsEmpty()) {
    const scoreDeltas = gameEngine.resolveNoLiarCall();
    io.to(lobbyCode).emit('game:round:noLiar', {
      scores: gameEngine.players
        .filter(p => !p.spectator)
        .map(p => ({ id: p.id, name: p.name, mainScore: p.mainScore })),
      scoreDeltas,
    });
    return startNextRoundOrEnd(io, lobbyCode, gameEngine);
  }
  gameEngine.nextTurn();
  return broadcastState(io, lobbyCode, gameEngine);
}

/**
 * Resolve a liar call by callerId: reveal, score, then next round or game end.
 * @returns {Promise<{ success, message?, gameState? }>}
 */
async function resolveLiarCall(io, lobbyCode, gameEngine, callerId) {
  const result = gameEngine.callLiar(callerId);
  if (!result.success) return result;

  const { truthful, isLiarCorrect, cardsPlayed, scoreDeltas, accusedId, bonusPaid } = result.result;
  const accused = gameEngine.players.find(p => p.id === accusedId);
  const caller = gameEngine.players.find(p => p.id === callerId);

  io.to(lobbyCode).emit('game:liar:revealed', {
    truthful,
    isLiarCorrect,
    cardsPlayed,
    accusedName: accused?.name,
    callerName: caller?.name,
    scoreDeltas,
    bonusPaid,
    scores: gameEngine.players
      .filter(p => !p.spectator)
      .map(p => ({ id: p.id, name: p.name, mainScore: p.mainScore })),
  });
  onLiarResolved(io, lobbyCode, { accused, caller, isLiarCorrect });

  const gameState = await startNextRoundOrEnd(io, lobbyCode, gameEngine);
  return gameState ? { success: true, gameState } : { success: true };
}

/** Hook for side effects after a liar call (bot chat lines are attached in chat step). */
let onLiarResolved = () => {};
function setLiarResolvedHook(fn) { onLiarResolved = fn; }

/** Make a bot take its turn (SPEC §2.2). */
async function botTurn(io, lobbyCode, gameEngine, bot) {
  const decision = BotBrain.decide({
    hand: bot.hand,
    myPlayed: gameEngine.playedThisRound[bot.id] || [],
    tableCard: gameEngine.winningCard,
    playHistory: gameEngine.playHistory,
    botId: bot.id,
    bonus: gameEngine.bonus,
  });

  if (decision.action === 'liar') {
    const res = await resolveLiarCall(io, lobbyCode, gameEngine, bot.id);
    if (res.success) return;
    // Not allowed (e.g. no play to call): fall through and play instead
  }

  const indices = decision.action === 'play'
    ? decision.indices
    : BotBrain.choosePlay(bot.hand, gameEngine.winningCard, Math.random);
  const result = gameEngine.playTurn(bot.id, indices);
  if (!result.success) {
    logger.error(`Bot ${bot.name} made an invalid play: ${result.message}`);
    gameEngine.playTurn(bot.id, [0]); // never stall the game
  }
  await afterPlay(io, lobbyCode, gameEngine);
}

/**
 * Arm the turn timer for the current player:
 * - bot → act after a think delay;
 * - disconnected human → auto-play one random card after AUTO_PLAY_MS (SPEC §2.1);
 * - connected human → no timer.
 */
function scheduleTurn(io, lobbyCode, gameEngine) {
  clearTimeout(turnTimers[lobbyCode]);
  delete turnTimers[lobbyCode];

  const currentId = gameEngine.turnOrder[gameEngine.currentPlayerIndex];
  const player = gameEngine.players.find(p => p.id === currentId);
  if (!player || player.hand.length === 0) return;
  if (!player.isBot && player.connected) return;

  const delay = player.isBot
    ? config.BOT_MIN_MS + Math.random() * (config.BOT_MAX_MS - config.BOT_MIN_MS)
    : config.AUTO_PLAY_MS;
  const round = gameEngine.roundNumber;
  const turn = gameEngine.playHistory.length;

  turnTimers[lobbyCode] = unref(setTimeout(async () => {
    delete turnTimers[lobbyCode];
    try {
      if (sessionStore.getSession(lobbyCode) !== gameEngine) return;
      // State moved on (someone else acted / round changed): a newer timer is in charge
      if (gameEngine.turnOrder[gameEngine.currentPlayerIndex] !== currentId) return;
      if (gameEngine.roundNumber !== round || gameEngine.playHistory.length !== turn) return;
      if (player.hand.length === 0) return;

      if (player.isBot) {
        await botTurn(io, lobbyCode, gameEngine, player);
        return;
      }
      if (player.connected) return;

      const index = Math.floor(Math.random() * player.hand.length);
      const result = gameEngine.playTurn(currentId, [index]);
      if (!result.success) return;

      logger.log(`Auto-played for disconnected ${player.name} in ${lobbyCode}`);
      io.to(lobbyCode).emit('game:autoPlayed', { playerId: currentId, playerName: player.name });
      await afterPlay(io, lobbyCode, gameEngine);
    } catch (error) {
      logger.error('Error in turn timer', error);
    }
  }, delay));
}

/** Remove a player from a running game (grace expired or left) — SPEC §2.1. */
async function removeFromGame(io, lobbyCode, gameEngine, playerId) {
  const player = gameEngine.players.find(p => p.id === playerId);
  if (!player || player.left) return;

  gameEngine.removePlayer(playerId);
  presenceStore.clearGrace(playerId);
  const lobby = lobbyStore.getLobby(lobbyCode);
  if (lobby) lobby.players = lobby.players.filter(p => p.id !== playerId);
  io.to(lobbyCode).emit('player:left', { playerId, playerName: player.name });

  // No humans left: close the game, bots don't play on alone (SPEC §2.2)
  if (!gameEngine.players.some(p => !p.isBot && !p.left)) {
    endGame(io, lobbyCode, gameEngine, null);
    return;
  }

  if (gameEngine.turnOrder.length <= 1) {
    const winner = gameEngine.players.find(p => p.id === gameEngine.turnOrder[0]);
    endGame(io, lobbyCode, gameEngine, winner);
    return;
  }

  if (gameEngine.allHandsEmpty()) {
    // Round can't continue and nobody earned anything: deal a fresh round
    await startNextRoundOrEnd(io, lobbyCode, gameEngine);
    return;
  }

  broadcastState(io, lobbyCode, gameEngine);
}

/** Start the countdown for a timed game. Returns the end time (ms epoch). */
function startGameTimer(io, lobbyCode, minutes) {
  const ms = minutes * 60 * 1000;
  gameTimers[lobbyCode] = unref(setTimeout(async () => {
    delete gameTimers[lobbyCode];
    const engine = sessionStore.getSession(lobbyCode);
    if (!engine) return;
    try {
      const { winner } = engine.resolveTimedGame();
      if (winner) {
        endGame(io, lobbyCode, engine, winner);
        return;
      }
      // Tiebreak: new round among the leaders
      engine.startRound();
      lobbyStore.updateRoundNumber(lobbyCode, engine.roundNumber);
      const state = engine.getGameState();
      io.to(lobbyCode).emit('game:timeUp', { tiebreak: true, gameState: state });
      broadcastState(io, lobbyCode, engine);
      await emitPrivateHands(io, lobbyCode, engine);
    } catch (error) {
      logger.error('Error resolving timed game', error);
    }
  }, ms));
  return Date.now() + ms;
}

module.exports = {
  emitPrivateHands,
  broadcastState,
  endGame,
  getFinishedGame,
  startNextRoundOrEnd,
  afterPlay,
  scheduleTurn,
  resolveLiarCall,
  setLiarResolvedHook,
  removeFromGame,
  startGameTimer,
};
