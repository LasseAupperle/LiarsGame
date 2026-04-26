/**
 * gameEvents.js - Socket.IO in-game event handlers
 */

const sessionStore = require('../store/sessionStore');
const lobbyStore = require('../store/lobbyStore');
const logger = require('../utils/logger');

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

module.exports = (io) => {
  io.on('connection', (socket) => {
    socket.on('game:play', async (lobbyCode, cardsIndices, callback) => {
      try {
        const { playerId } = socket.data;
        if (!playerId) {
          cb(callback, { success: false, message: 'Not authenticated' });
          return;
        }

        const gameEngine = sessionStore.getSession(lobbyCode);
        if (!gameEngine) {
          cb(callback, { success: false, message: 'Game session not found' });
          return;
        }

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

    socket.on('game:callLiar', async (lobbyCode, callback) => {
      try {
        const { playerId } = socket.data;
        if (!playerId) {
          cb(callback, { success: false, message: 'Not authenticated' });
          return;
        }

        const gameEngine = sessionStore.getSession(lobbyCode);
        if (!gameEngine) {
          cb(callback, { success: false, message: 'Game session not found' });
          return;
        }

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
        const gameState = gameEngine.getGameState();
        io.to(lobbyCode).emit('game:state', gameState);
        await emitPrivateHands(io, lobbyCode, gameEngine);

        cb(callback, { success: true, gameState });
      } catch (error) {
        logger.error('Error calling liar', error);
        cb(callback, { success: false, message: 'Server error' });
      }
    });

    socket.on('game:nextTurn', (lobbyCode, callback) => {
      try {
        const gameEngine = sessionStore.getSession(lobbyCode);
        if (!gameEngine) {
          cb(callback, { success: false, message: 'Game session not found' });
          return;
        }

        gameEngine.nextTurn();
        const gameState = gameEngine.getGameState();

        io.to(lobbyCode).emit('game:turn', {
          currentPlayerId: gameState.currentPlayerId,
          timeLimit: 30
        });

        io.to(lobbyCode).emit('game:state', gameState);
        cb(callback, { success: true, gameState });
      } catch (error) {
        logger.error('Error advancing turn', error);
        cb(callback, { success: false, message: 'Server error' });
      }
    });
  });
};
