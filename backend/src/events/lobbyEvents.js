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

// lobbyCode → setTimeout handle for timed game countdown
const gameTimers = {};

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

    socket.on('lobby:create', (playerName, settings, callback) => {
      // Support old clients that omit settings
      if (typeof settings === 'function') { callback = settings; settings = {}; }
      try {
        const playerId = uuidv4();
        const lobbyCode = generateLobbyCode();

        const result = lobbyStore.createLobby(lobbyCode, playerName, playerId, settings);
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

    socket.on('lobby:join', async (lobbyCode, playerName, callback) => {
      try {
        const playerId = uuidv4();
        const result = lobbyStore.joinLobby(lobbyCode.toUpperCase(), playerName, playerId);

        if (!result.success) {
          cb(callback, { success: false, message: result.message });
          return;
        }

        socket.join(lobbyCode.toUpperCase());
        socket.data.lobbyCode = lobbyCode.toUpperCase();
        socket.data.playerId = playerId;
        socket.data.playerName = playerName;

        if (result.joinedRunning) {
          // Mid-game join — add player to GameEngine
          const gameEngine = sessionStore.getSession(lobbyCode.toUpperCase());
          if (gameEngine) {
            const newPlayer = new Player(playerId, playerName);
            gameEngine.players.push(newPlayer);
            const gameState = gameEngine.getGameState();
            socket.emit('game:state', gameState);
            socket.emit('game:hand', []);
            io.to(lobbyCode.toUpperCase()).emit('game:state', gameState);
          }
          cb(callback, { success: true, lobbyCode: lobbyCode.toUpperCase(), playerId, joinedRunning: true });
          return;
        }

        const lobby = lobbyStore.getLobby(lobbyCode.toUpperCase());
        io.to(lobbyCode.toUpperCase()).emit('lobby:updated', {
          lobbyCode: lobbyCode.toUpperCase(),
          players: lobby.players
        });

        cb(callback, {
          success: true,
          lobbyCode: lobbyCode.toUpperCase(),
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
        const gameEngine = new GameEngine(players, startResult.settings);
        const sessionResult = sessionStore.createSession(lobbyCode, gameEngine);
        if (!sessionResult.success) {
          cb(callback, { success: false, message: sessionResult.message });
          return;
        }

        gameEngine.startRound();
        lobbyStore.updateRoundNumber(lobbyCode, gameEngine.roundNumber);
        const gameState = gameEngine.getGameState();

        let endTime = null;
        if (startResult.settings?.mode === 'timed' && startResult.settings?.timedMinutes) {
          endTime = Date.now() + startResult.settings.timedMinutes * 60 * 1000;
          gameTimers[lobbyCode] = setTimeout(() => {
            delete gameTimers[lobbyCode];
            const engine = sessionStore.getSession(lobbyCode);
            if (!engine) return;
            const timedResult = engine.resolveTimedGame();
            if (timedResult.winner) {
              io.to(lobbyCode).emit('game:won', {
                winnerId: timedResult.winner.id,
                winnerName: timedResult.winner.name,
                finalScore: timedResult.winner.mainScore,
              });
              sessionStore.deleteSession(lobbyCode);
              lobbyStore.deleteLobby(lobbyCode);
            } else {
              // Tiebreak: start new round among leaders
              engine.startRound();
              const tbState = engine.getGameState();
              io.to(lobbyCode).emit('game:timeUp', { tiebreak: true, gameState: tbState });
              emitPrivateHands(io, lobbyCode, engine);
            }
          }, startResult.settings.timedMinutes * 60 * 1000);
        }

        io.to(lobbyCode).emit('game:started', { lobbyCode, gameState, settings: startResult.settings, endTime });

        await emitPrivateHands(io, lobbyCode, gameEngine);

        cb(callback, { success: true, gameState, settings: startResult.settings, endTime });
      } catch (error) {
        logger.error('Error starting game', error);
        cb(callback, { success: false, message: 'Server error' });
      }
    });

    socket.on('lobby:list', (callback) => {
      try {
        const lobbies = lobbyStore.getAllPublicLobbies();
        cb(callback, { success: true, lobbies });
      } catch (error) {
        logger.error('Error listing lobbies', error);
        cb(callback, { success: false, lobbies: [] });
      }
    });

    socket.on('game:checkRejoin', ({ lobbyCode, playerId }, callback) => {
      try {
        const inTimer = !!disconnectTimers[playerId];
        const engine = sessionStore.getSession(lobbyCode);
        const player = engine?.players.find(p => p.id === playerId && !p.spectator);
        cb(callback, { canRejoin: !!(inTimer || player) });
      } catch (error) {
        cb(callback, { canRejoin: false });
      }
    });

    socket.on('game:rejoin', (lobbyCode, playerId, callback) => {
      try {
        const gameEngine = sessionStore.getSession(lobbyCode);
        if (!gameEngine) {
          cb(callback, { success: false, message: 'Game no longer active' });
          return;
        }

        const player = gameEngine.players.find(p => p.id === playerId);
        const inTimer = !!disconnectTimers[playerId];

        if (!player && !inTimer) {
          cb(callback, { success: false, message: 'Not a member of this game' });
          return;
        }

        // Clear disconnect timer if active
        if (inTimer) {
          clearTimeout(disconnectTimers[playerId]);
          delete disconnectTimers[playerId];
        }

        // Re-activate if player was spectated due to timeout
        if (player && player.spectator) {
          player.spectator = false;
          if (!gameEngine.turnOrder.includes(playerId)) {
            gameEngine.turnOrder.push(playerId);
          }
        }

        socket.join(lobbyCode);
        socket.data.lobbyCode = lobbyCode;
        socket.data.playerId = playerId;

        const gameState = gameEngine.getGameState();
        socket.emit('game:state', gameState);
        if (player) socket.emit('game:hand', player.hand);

        io.to(lobbyCode).emit('player:reconnected', { playerId });
        cb(callback, { success: true, gameState, hand: player?.hand ?? [] });
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
          io.to(lobbyCode).emit('player:disconnected', { playerId, playerName, timeoutMs: 120000 });
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
          }, 120000);
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
