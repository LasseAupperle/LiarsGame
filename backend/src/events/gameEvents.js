/**
 * gameEvents.js - Socket.IO in-game event handlers
 */

const sessionStore = require('../store/sessionStore');
const logger = require('../utils/logger');

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
          callback({ success: false, message: 'Not authenticated' });
          return;
        }

        const gameEngine = sessionStore.getSession(lobbyCode);
        if (!gameEngine) {
          callback({ success: false, message: 'Game session not found' });
          return;
        }

        const result = gameEngine.playTurn(playerId, cardsIndices);
        if (!result.success) {
          callback(result);
          return;
        }

        // Auto-advance turn after play
        gameEngine.nextTurn();

        const gameState = gameEngine.getGameState();
        io.to(lobbyCode).emit('game:state', gameState);

        // Send updated hand to the player who just played
        const player = gameEngine.players.find(p => p.id === playerId);
        if (player) {
          socket.emit('game:hand', player.hand);
        }

        callback({ success: true, gameState });
      } catch (error) {
        logger.error('Error playing turn', error);
        callback({ success: false, message: 'Server error' });
      }
    });

    socket.on('game:callLiar', async (lobbyCode, callback) => {
      try {
        const { playerId } = socket.data;
        if (!playerId) {
          callback({ success: false, message: 'Not authenticated' });
          return;
        }

        const gameEngine = sessionStore.getSession(lobbyCode);
        if (!gameEngine) {
          callback({ success: false, message: 'Game session not found' });
          return;
        }

        const result = gameEngine.callLiar(playerId);
        if (!result.success) {
          callback(result);
          return;
        }

        const { truthful, isLiarCorrect, cardsPlayed, scoreDeltas } = result.result;

        // Emit liar resolution to all players
        io.to(lobbyCode).emit('game:liar:revealed', {
          truthful,
          isLiarCorrect,
          cardsPlayed,
          scores: gameEngine.getGameState().players.map(p => ({
            id: p.id,
            mainScore: p.mainScore
          }))
        });

        // Check for victory
        const winner = gameEngine.isVictoryConditionMet();
        if (winner) {
          io.to(lobbyCode).emit('game:won', {
            winnerId: winner.id,
            winnerName: winner.name,
            finalScore: winner.mainScore
          });
          sessionStore.deleteSession(lobbyCode);
          callback({ success: true });
          return;
        }

        // Start new round
        gameEngine.startRound();
        const gameState = gameEngine.getGameState();
        io.to(lobbyCode).emit('game:state', gameState);
        await emitPrivateHands(io, lobbyCode, gameEngine);

        callback({ success: true, gameState });
      } catch (error) {
        logger.error('Error calling liar', error);
        callback({ success: false, message: 'Server error' });
      }
    });

    socket.on('game:nextTurn', (lobbyCode, callback) => {
      try {
        const gameEngine = sessionStore.getSession(lobbyCode);
        if (!gameEngine) {
          callback({ success: false, message: 'Game session not found' });
          return;
        }

        gameEngine.nextTurn();
        const gameState = gameEngine.getGameState();

        io.to(lobbyCode).emit('game:turn', {
          currentPlayerId: gameState.currentPlayerId,
          timeLimit: 30
        });

        io.to(lobbyCode).emit('game:state', gameState);
        callback({ success: true, gameState });
      } catch (error) {
        logger.error('Error advancing turn', error);
        callback({ success: false, message: 'Server error' });
      }
    });
  });
};
