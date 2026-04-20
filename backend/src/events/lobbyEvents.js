/**
 * lobbyEvents.js - Socket.IO lobby event handlers
 */

const { v4: uuidv4 } = require('uuid');
const generateLobbyCode = require('../utils/generateLobbyCode');
const lobbyStore = require('../store/lobbyStore');
const sessionStore = require('../store/sessionStore');
const GameEngine = require('../game/GameEngine');
const Player = require('../game/Player');
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
    logger.log(`User connected: ${socket.id}`);

    socket.on('lobby:create', (playerName, callback) => {
      try {
        const playerId = uuidv4();
        const lobbyCode = generateLobbyCode();

        const result = lobbyStore.createLobby(lobbyCode, playerName, playerId);
        if (!result.success) {
          callback({ success: false, message: result.message });
          return;
        }

        socket.join(lobbyCode);
        socket.data.lobbyCode = lobbyCode;
        socket.data.playerId = playerId;
        socket.data.playerName = playerName;

        const lobby = lobbyStore.getLobby(lobbyCode);
        io.to(lobbyCode).emit('lobby:updated', {
          lobbyCode,
          players: lobby.players
        });

        callback({
          success: true,
          lobbyCode,
          playerId,
          players: lobby.players
        });
      } catch (error) {
        logger.error('Error creating lobby', error);
        callback({ success: false, message: 'Server error' });
      }
    });

    socket.on('lobby:join', (lobbyCode, playerName, callback) => {
      try {
        const playerId = uuidv4();
        const result = lobbyStore.joinLobby(lobbyCode.toUpperCase(), playerName, playerId);

        if (!result.success) {
          callback({ success: false, message: result.message });
          return;
        }

        socket.join(lobbyCode);
        socket.data.lobbyCode = lobbyCode;
        socket.data.playerId = playerId;
        socket.data.playerName = playerName;

        const lobby = lobbyStore.getLobby(lobbyCode);
        io.to(lobbyCode).emit('lobby:updated', {
          lobbyCode,
          players: lobby.players
        });

        callback({
          success: true,
          lobbyCode,
          playerId,
          players: lobby.players
        });
      } catch (error) {
        logger.error('Error joining lobby', error);
        callback({ success: false, message: 'Server error' });
      }
    });

    socket.on('lobby:leave', (callback) => {
      try {
        const { lobbyCode, playerId } = socket.data;
        if (!lobbyCode) {
          callback({ success: false, message: 'Not in a lobby' });
          return;
        }

        lobbyStore.leaveLobby(lobbyCode, playerId);
        socket.leave(lobbyCode);

        const lobby = lobbyStore.getLobby(lobbyCode);
        if (lobby) {
          io.to(lobbyCode).emit('lobby:updated', {
            lobbyCode,
            players: lobby.players
          });
        }

        callback({ success: true });
      } catch (error) {
        logger.error('Error leaving lobby', error);
        callback({ success: false, message: 'Server error' });
      }
    });

    socket.on('lobby:start', async (callback) => {
      try {
        const { lobbyCode, playerId } = socket.data;
        if (!lobbyCode) {
          callback({ success: false, message: 'Not in a lobby' });
          return;
        }

        const lobby = lobbyStore.getLobby(lobbyCode);
        if (!lobby) {
          callback({ success: false, message: 'Lobby not found' });
          return;
        }

        if (lobby.host !== playerId) {
          callback({ success: false, message: 'Only host can start game' });
          return;
        }

        const startResult = lobbyStore.startGame(lobbyCode);
        if (!startResult.success) {
          callback({ success: false, message: startResult.message });
          return;
        }

        // Create game engine and start first round
        const players = lobby.players.map(p => new Player(p.id, p.name));
        const gameEngine = new GameEngine(players);
        const sessionResult = sessionStore.createSession(lobbyCode, gameEngine);
        if (!sessionResult.success) {
          callback({ success: false, message: sessionResult.message });
          return;
        }

        gameEngine.startRound();
        const gameState = gameEngine.getGameState();

        io.to(lobbyCode).emit('game:started', { lobbyCode, gameState });

        await emitPrivateHands(io, lobbyCode, gameEngine);

        callback({ success: true });
      } catch (error) {
        logger.error('Error starting game', error);
        callback({ success: false, message: 'Server error' });
      }
    });

    socket.on('disconnect', () => {
      const { lobbyCode, playerId } = socket.data;
      if (lobbyCode && playerId) {
        lobbyStore.leaveLobby(lobbyCode, playerId);
        const lobby = lobbyStore.getLobby(lobbyCode);
        if (lobby) {
          io.to(lobbyCode).emit('lobby:updated', {
            lobbyCode,
            players: lobby.players
          });
        }
      }
      logger.log(`User disconnected: ${socket.id}`);
    });
  });
};
