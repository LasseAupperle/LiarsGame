/**
 * gameEvents.js - Socket.IO in-game event handlers (SPEC §3, §4)
 */

const sessionStore = require('../store/sessionStore');
const logger = require('../utils/logger');
const validate = require('../utils/validate');
const flow = require('./gameFlow');

const cb = (callback, data) => {
  if (typeof callback === 'function') callback(data);
};

/**
 * Resolve the game for an in-game event and check the sender belongs to it.
 * Game events act only on the lobby the socket joined (SPEC §3).
 * @returns {{ error: string } | { gameEngine, playerId, lobbyCode }}
 */
function resolveGame(socket, rawLobbyCode) {
  const { playerId, lobbyCode: socketLobby } = socket.data;
  if (!playerId || !socketLobby) return { error: 'Not authenticated' };
  const lobbyCode = validate.lobbyCode(rawLobbyCode);
  if (!lobbyCode || lobbyCode !== socketLobby) return { error: 'Not in this game' };
  const gameEngine = sessionStore.getSession(lobbyCode);
  if (!gameEngine) return { error: 'Game session not found' };
  if (!gameEngine.players.some(p => p.id === playerId)) return { error: 'Not in this game' };
  return { gameEngine, playerId, lobbyCode };
}

module.exports = (io) => {
  io.on('connection', (socket) => {
    socket.on('game:play', async (rawLobbyCode, cardIndices, callback) => {
      try {
        const ctx = resolveGame(socket, rawLobbyCode);
        if (ctx.error) {
          cb(callback, { success: false, message: ctx.error });
          return;
        }
        const { gameEngine, playerId, lobbyCode } = ctx;

        const result = gameEngine.playTurn(playerId, cardIndices);
        if (!result.success) {
          cb(callback, result);
          return;
        }

        const player = gameEngine.players.find(p => p.id === playerId);
        socket.emit('game:hand', player.hand);

        const gameState = await flow.afterPlay(io, lobbyCode, gameEngine);
        cb(callback, gameState ? { success: true, gameState } : { success: true });
      } catch (error) {
        logger.error('Error playing turn', error);
        cb(callback, { success: false, message: 'Server error' });
      }
    });

    socket.on('game:callLiar', async (rawLobbyCode, callback) => {
      try {
        const ctx = resolveGame(socket, rawLobbyCode);
        if (ctx.error) {
          cb(callback, { success: false, message: ctx.error });
          return;
        }
        const { gameEngine, playerId, lobbyCode } = ctx;

        const result = await flow.resolveLiarCall(io, lobbyCode, gameEngine, playerId);
        cb(callback, result);
      } catch (error) {
        logger.error('Error calling liar', error);
        cb(callback, { success: false, message: 'Server error' });
      }
    });
  });
};
