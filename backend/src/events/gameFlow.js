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
  scheduleAutoPlay(io, lobbyCode, gameEngine);
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

/** If the current player is disconnected, auto-play one random card for them later. */
function scheduleAutoPlay(io, lobbyCode, gameEngine) {
  clearTimeout(turnTimers[lobbyCode]);
  delete turnTimers[lobbyCode];

  const currentId = gameEngine.turnOrder[gameEngine.currentPlayerIndex];
  const player = gameEngine.players.find(p => p.id === currentId);
  if (!player || player.connected || player.hand.length === 0) return;

  turnTimers[lobbyCode] = unref(setTimeout(async () => {
    delete turnTimers[lobbyCode];
    try {
      if (sessionStore.getSession(lobbyCode) !== gameEngine) return;
      if (gameEngine.turnOrder[gameEngine.currentPlayerIndex] !== currentId || player.connected) return;
      if (player.hand.length === 0) return;

      const index = Math.floor(Math.random() * player.hand.length);
      const result = gameEngine.playTurn(currentId, [index]);
      if (!result.success) return;

      logger.log(`Auto-played for disconnected ${player.name} in ${lobbyCode}`);
      io.to(lobbyCode).emit('game:autoPlayed', { playerId: currentId, playerName: player.name });
      await afterPlay(io, lobbyCode, gameEngine);
    } catch (error) {
      logger.error('Error auto-playing', error);
    }
  }, config.AUTO_PLAY_MS));
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
  scheduleAutoPlay,
  removeFromGame,
  startGameTimer,
};
