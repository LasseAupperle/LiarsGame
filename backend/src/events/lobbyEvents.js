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

const cb = (callback, data) => {
  if (typeof callback === 'function') callback(data);
};

// playerId → setTimeout handle for in-game disconnect grace period
const disconnectTimers = {};

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
          cb(callback, { success: false, message: result.message });
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

        cb(callback, {
          success: true,
          lobbyCode,
          playerId,
          players: lobby.players
        });
      } catch (error) {
        logger.error('Error creating lobby', error);
        cb(callback, { success: false, message: 'Server error' });
      }
    });

    socket.on('lobby:join', (lobbyCode, playerName, callback) => {
      try {
        const playerId = uuidv4();
        const result = lobbyStore.joinLobby(lobbyCode.toUpperCase(), playerName, playerId);

        if (!result.success) {
          cb(callback, { success: false, message: result.message });
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

        cb(callback, {
          success: true,
          lobbyCode,
          playerId,
          players: lobby.players
        });
      } catch (error) {
        logger.error('Error joining lobby', error);
        cb(callback, { success: false, message: 'Server error' });
      }
    });

    socket.on('lobby:leave', (callback) => {
      try {
        const { lobbyCode, playerId } = socket.data;
        if (!lobbyCode) {
          cb(callback, { success: false, message: 'Not in a lobby' });
          return;
        }

        lobbyStore.leaveLobby(lobbyCode, playerId);
        socket.leave(lobbyCode);
        socket.data.lobbyCode = null;
        socket.data.playerId = null;

        const lobby = lobbyStore.getLobby(lobbyCode);
        if (lobby) {
          io.to(lobbyCode).emit('lobby:updated', {
            lobbyCode,
            players: lobby.players
          });
        }

        cb(callback, { success: true });
      } catch (error) {
        logger.error('Error leaving lobby', error);
        cb(callback, { success: false, message: 'Server error' });
      }
    });

    socket.on('lobby:start', async (callback) => {
      try {
        const { lobbyCode, playerId } = socket.data;
        if (!lobbyCode) {
          cb(callback, { success: false, message: 'Not in a lobby' });
          return;
        }

        const lobby = lobbyStore.getLobby(lobbyCode);
        if (!lobby) {
          cb(callback, { success: false, message: 'Lobby not found' });
          return;
        }

        if (lobby.host !== playerId) {
          cb(callback, { success: false, message: 'Only host can start game' });
          return;
        }

        const startResult = lobbyStore.startGame(lobbyCode);
        if (!startResult.success) {
          cb(callback, { success: false, message: startResult.message });
          return;
        }

        const players = lobby.players.map(p => new Player(p.id, p.name));
        const gameEngine = new GameEngine(players);
        const sessionResult = sessionStore.createSession(lobbyCode, gameEngine);
        if (!sessionResult.success) {
          cb(callback, { success: false, message: sessionResult.message });
          return;
        }

        gameEngine.startRound();
        const gameState = gameEngine.getGameState();

        io.to(lobbyCode).emit('game:started', { lobbyCode, gameState });

        await emitPrivateHands(io, lobbyCode, gameEngine);

        cb(callback, { success: true });
      } catch (error) {
        logger.error('Error starting game', error);
        cb(callback, { success: false, message: 'Server error' });
      }
    });

    socket.on('lobby:list', (callback) => {
      try {
        const lobbies = lobbyStore.getPublicLobbies();
        cb(callback, { success: true, lobbies });
      } catch (error) {
        logger.error('Error listing lobbies', error);
        cb(callback, { success: false, lobbies: [] });
      }
    });

    socket.on('game:rejoin', (lobbyCode, playerId, callback) => {
      try {
        const timer = disconnectTimers[playerId];
        if (!timer) {
          cb(callback, { success: false, message: 'Rejoin window expired' });
          return;
        }

        clearTimeout(timer);
        delete disconnectTimers[playerId];

        socket.join(lobbyCode);
        socket.data.lobbyCode = lobbyCode;
        socket.data.playerId = playerId;

        const gameEngine = sessionStore.getSession(lobbyCode);
        if (!gameEngine) {
          cb(callback, { success: false, message: 'Game no longer active' });
          return;
        }

        const gameState = gameEngine.getGameState();
        socket.emit('game:state', gameState);

        const player = gameEngine.players.find(p => p.id === playerId);
        if (player) socket.emit('game:hand', player.hand);

        io.to(lobbyCode).emit('player:reconnected', { playerId });
        cb(callback, { success: true, gameState });
      } catch (error) {
        logger.error('Error rejoining game', error);
        cb(callback, { success: false, message: 'Server error' });
      }
    });

    socket.on('disconnect', () => {
      const { lobbyCode, playerId, playerName } = socket.data;
      if (lobbyCode && playerId) {
        const gameEngine = sessionStore.getSession(lobbyCode);
        if (gameEngine) {
          // In active game — start 30s grace period
          io.to(lobbyCode).emit('player:disconnected', { playerId, playerName, timeoutMs: 30000 });
          disconnectTimers[playerId] = setTimeout(() => {
            delete disconnectTimers[playerId];
            gameEngine.removePlayer(playerId);
            const gameState = gameEngine.getGameState();
            io.to(lobbyCode).emit('game:state', gameState);
            io.to(lobbyCode).emit('player:left', { playerId, playerName });

            // If only 1 or 0 active players remain, end the game
            const remaining = gameState.turnOrder;
            if (remaining.length <= 1) {
              const winner = gameEngine.players.find(p => p.id === remaining[0]);
              if (winner) {
                io.to(lobbyCode).emit('game:won', {
                  winnerId: winner.id,
                  winnerName: winner.name,
                  finalScore: winner.mainScore
                });
              }
              sessionStore.deleteSession(lobbyCode);
              lobbyStore.deleteLobby(lobbyCode);
            }
          }, 30000);
        } else {
          // In lobby — remove immediately
          lobbyStore.leaveLobby(lobbyCode, playerId);
          const lobby = lobbyStore.getLobby(lobbyCode);
          if (lobby) {
            io.to(lobbyCode).emit('lobby:updated', {
              lobbyCode,
              players: lobby.players
            });
          }
        }
      }
      logger.log(`User disconnected: ${socket.id}`);
    });
  });
};
