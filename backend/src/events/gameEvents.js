/**
 * gameEvents.js - Socket.IO in-game event handlers
 */

const sessionStore = require('../store/sessionStore');
const lobbyStore = require('../store/lobbyStore');
const logger = require('../utils/logger');
const validate = require('../utils/validate');

const cb = (callback, data) => {
  if (typeof callback === 'function') callback(data);
};

async function emitPrivateHands(io, lobbyCode, gameEngine) {
  const sockets = await io.in(lobbyCode).fetchSockets();
  for (const s of sockets) {
    const player = gameEngine.players.find(p => p.id === s.data.playerId);
    if (player) {
      s.emit('game:hand', player.hand);
    }
  }
}

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
    socket.on('game:play', async (rawLobbyCode, cardsIndices, callback) => {
      try {
        const ctx = resolveGame(socket, rawLobbyCode);
        if (ctx.error) {
          cb(callback, { success: false, message: ctx.error });
          return;
        }
        const { gameEngine, playerId, lobbyCode } = ctx;

        const result = gameEngine.playTurn(playerId, cardsIndices);
        if (!result.success) {
          cb(callback, result);
          return;
        }

        // Emit updated hand to the player who just played
        const player = gameEngine.players.find(p => p.id === playerId);
        if (player) {
          socket.emit('game:hand', player.hand);
        }

        // Check if all active players have empty hands — no liar call round end
        const activePlayers = gameEngine.players.filter(p => !p.spectator);
        const allHandsEmpty = activePlayers.every(p => p.hand.length === 0);

        if (allHandsEmpty) {
          gameEngine.resolveNoLiarCall();

          const activePlayers = gameEngine.players.filter(p => !p.spectator);
          const noLiarDeltas = {};
          activePlayers.forEach(p => { noLiarDeltas[p.id] = 1; });
          io.to(lobbyCode).emit('game:round:noLiar', {
            scores: activePlayers.map(p => ({ id: p.id, name: p.name, mainScore: p.mainScore })),
            scoreDeltas: noLiarDeltas,
          });

          const winner = gameEngine.isVictoryConditionMet();
          if (winner) {
            io.to(lobbyCode).emit('game:won', {
              winnerId: winner.id,
              winnerName: winner.name,
              finalScore: winner.mainScore
            });
            sessionStore.deleteSession(lobbyCode);
            lobbyStore.deleteLobby(lobbyCode);
            cb(callback, { success: true });
            return;
          }

          gameEngine.startRound();
          lobbyStore.updateRoundNumber(lobbyCode, gameEngine.roundNumber);
          const newRoundState = gameEngine.getGameState();
          io.to(lobbyCode).emit('game:state', newRoundState);
          await emitPrivateHands(io, lobbyCode, gameEngine);
          cb(callback, { success: true, gameState: newRoundState });
          return;
        }

        gameEngine.nextTurn();

        const gameState = gameEngine.getGameState();
        io.to(lobbyCode).emit('game:state', gameState);

        cb(callback, { success: true, gameState });
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

        const result = gameEngine.callLiar(playerId);
        if (!result.success) {
          cb(callback, result);
          return;
        }

        const { truthful, isLiarCorrect, cardsPlayed, scoreDeltas } = result.result;

        const accusedId = Object.keys(scoreDeltas)[0];
        const accusedPlayer = gameEngine.players.find(p => p.id === accusedId);
        const callerPlayer = gameEngine.players.find(p => p.id === playerId);

        io.to(lobbyCode).emit('game:liar:revealed', {
          truthful,
          isLiarCorrect,
          cardsPlayed,
          accusedName: accusedPlayer?.name,
          callerName: callerPlayer?.name,
          scoreDeltas,
          scores: gameEngine.players
            .filter(p => !p.spectator)
            .map(p => ({ id: p.id, name: p.name, mainScore: p.mainScore }))
        });

        const winner = gameEngine.isVictoryConditionMet();
        if (winner) {
          io.to(lobbyCode).emit('game:won', {
            winnerId: winner.id,
            winnerName: winner.name,
            finalScore: winner.mainScore
          });
          sessionStore.deleteSession(lobbyCode);
          lobbyStore.deleteLobby(lobbyCode);
          cb(callback, { success: true });
          return;
        }

        gameEngine.startRound();
        lobbyStore.updateRoundNumber(lobbyCode, gameEngine.roundNumber);
        const gameState = gameEngine.getGameState();
        io.to(lobbyCode).emit('game:state', gameState);
        await emitPrivateHands(io, lobbyCode, gameEngine);

        cb(callback, { success: true, gameState });
      } catch (error) {
        logger.error('Error calling liar', error);
        cb(callback, { success: false, message: 'Server error' });
      }
    });
  });
};
