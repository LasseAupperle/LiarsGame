/**
 * gameEvents.js - Socket.IO in-game event handlers
 */

const GameEngine = require('../game/GameEngine');
const Player = require('../game/Player');
const sessionStore = require('../store/sessionStore');
const logger = require('../utils/logger');

module.exports = (io) => {
  io.on('connection', (socket) => {
    socket.on('game:play', (lobbyCode, cardsIndices, callback) => {
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

        const gameState = gameEngine.getGameState();
        io.to(lobbyCode).emit('game:state', gameState);

        callback({ success: true, gameState });
      } catch (error) {
        logger.error('Error playing turn', error);
        callback({ success: false, message: 'Server error' });
      }
    });

    socket.on('game:callLiar', (lobbyCode, callback) => {
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
          })),
          bonusModifier: gameEngine.players[0].bonusModifier // Assuming shared bonus
        });

        // Check for victory
        const winner = gameEngine.isVictoryConditionMet();
        if (winner) {
          io.to(lobbyCode).emit('game:won', {
            winnerId: winner.id,
            winnerName: winner.name,
            finalScore: winner.mainScore
          });
          return;
        }

        const gameState = gameEngine.getGameState();
        io.to(lobbyCode).emit('game:state', gameState);

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
          timeLimit: 30 // 30 seconds per turn
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
