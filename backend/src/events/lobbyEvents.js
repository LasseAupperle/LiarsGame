/**
 * lobbyEvents.js - Socket.IO lobby, presence and rejoin handlers (SPEC §2, §4)
 */

const { v4: uuidv4 } = require('uuid');
const generateLobbyCode = require('../utils/generateLobbyCode');
const lobbyStore = require('../store/lobbyStore');
const sessionStore = require('../store/sessionStore');
const presenceStore = require('../store/presenceStore');
const GameEngine = require('../game/GameEngine');
const Player = require('../game/Player');
const config = require('../config');
const logger = require('../utils/logger');
const validate = require('../utils/validate');
const flow = require('./gameFlow');

const cb = (callback, data) => {
  if (typeof callback === 'function') callback(data);
};

const MAX_PLAYERS = 4;

function emitLobbyUpdate(io, lobbyCode) {
  const view = lobbyStore.getLobbyView(lobbyCode);
  if (view) io.to(lobbyCode).emit('lobby:updated', view);
}

/** Attach a socket to a player in a lobby/game. */
function attach(socket, lobbyCode, playerId, playerName) {
  socket.join(lobbyCode);
  socket.data.lobbyCode = lobbyCode;
  socket.data.playerId = playerId;
  socket.data.playerName = playerName;
  presenceStore.bind(playerId, socket.id);
}

/** Start the in-game grace period for a disconnected player (SPEC §2.1). */
function startGameGrace(io, lobbyCode, gameEngine, playerId) {
  presenceStore.startGrace(playerId, config.GAME_GRACE_MS, () => {
    if (sessionStore.getSession(lobbyCode) !== gameEngine) return;
    flow.removeFromGame(io, lobbyCode, gameEngine, playerId)
      .catch(error => logger.error('Error removing player', error));
  });
}

/** Remove a player from a waiting lobby and notify the rest. */
function removeFromLobby(io, lobbyCode, playerId) {
  lobbyStore.leaveLobby(lobbyCode, playerId);
  presenceStore.forget(playerId);
  emitLobbyUpdate(io, lobbyCode);
}

module.exports = (io) => {
  io.on('connection', (socket) => {
    logger.log(`User connected: ${socket.id}`);

    socket.on('lobby:create', (rawName, rawSettings, callback) => {
      // Support old clients that omit settings
      if (typeof rawSettings === 'function') { callback = rawSettings; rawSettings = {}; }
      try {
        const playerName = validate.playerName(rawName);
        if (!playerName) {
          cb(callback, { success: false, message: `Name must be 1-${validate.MAX_NAME_LENGTH} characters` });
          return;
        }
        const settings = validate.gameSettings(rawSettings);
        if (!settings) {
          cb(callback, { success: false, message: 'Invalid game settings' });
          return;
        }

        const playerId = uuidv4();
        // Codes must be unique among live lobbies (SPEC §2)
        let lobbyCode;
        do { lobbyCode = generateLobbyCode(); } while (lobbyStore.getLobby(lobbyCode));

        const result = lobbyStore.createLobby(lobbyCode, playerName, playerId, settings);
        if (!result.success) {
          cb(callback, { success: false, message: result.message });
          return;
        }

        attach(socket, lobbyCode, playerId, playerName);
        const token = presenceStore.issueToken(playerId);
        emitLobbyUpdate(io, lobbyCode);

        const lobby = lobbyStore.getLobby(lobbyCode);
        cb(callback, { success: true, lobbyCode, playerId, token, players: lobby.players, host: lobby.host });
      } catch (error) {
        logger.error('Error creating lobby', error);
        cb(callback, { success: false, message: 'Server error' });
      }
    });

    socket.on('lobby:join', async (rawCode, rawName, callback) => {
      try {
        const lobbyCode = validate.lobbyCode(rawCode);
        if (!lobbyCode) {
          cb(callback, { success: false, message: 'Invalid lobby code' });
          return;
        }
        const playerName = validate.playerName(rawName);
        if (!playerName) {
          cb(callback, { success: false, message: `Name must be 1-${validate.MAX_NAME_LENGTH} characters` });
          return;
        }

        const playerId = uuidv4();
        const result = lobbyStore.joinLobby(lobbyCode, playerName, playerId);
        if (!result.success) {
          cb(callback, { success: false, message: result.message });
          return;
        }

        attach(socket, lobbyCode, playerId, playerName);
        const token = presenceStore.issueToken(playerId);

        if (result.joinedRunning) {
          // Mid-game join: sits out this round, dealt in from the next (SPEC §2)
          const gameEngine = sessionStore.getSession(lobbyCode);
          if (gameEngine) {
            gameEngine.players.push(new Player(playerId, playerName));
            socket.emit('game:hand', []);
            flow.broadcastState(io, lobbyCode, gameEngine);
          }
          cb(callback, { success: true, lobbyCode, playerId, token, joinedRunning: true });
          return;
        }

        emitLobbyUpdate(io, lobbyCode);
        const lobby = lobbyStore.getLobby(lobbyCode);
        cb(callback, { success: true, lobbyCode, playerId, token, players: lobby.players, host: lobby.host });
      } catch (error) {
        logger.error('Error joining lobby', error);
        cb(callback, { success: false, message: 'Server error' });
      }
    });

    socket.on('lobby:leave', async (callback) => {
      try {
        const { lobbyCode, playerId } = socket.data;
        if (!lobbyCode) {
          cb(callback, { success: false, message: 'Not in a lobby' });
          return;
        }

        socket.leave(lobbyCode);
        socket.data.lobbyCode = null;
        socket.data.playerId = null;

        const gameEngine = sessionStore.getSession(lobbyCode);
        if (gameEngine) {
          // Leaving a running game removes you immediately (SPEC §2.1)
          presenceStore.forget(playerId);
          await flow.removeFromGame(io, lobbyCode, gameEngine, playerId);
        } else {
          removeFromLobby(io, lobbyCode, playerId);
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

        const players = lobby.players.map(p => {
          const player = new Player(p.id, p.name, { isBot: !!p.isBot });
          player.connected = p.connected !== false;
          return player;
        });
        const gameEngine = new GameEngine(players, startResult.settings);
        const sessionResult = sessionStore.createSession(lobbyCode, gameEngine);
        if (!sessionResult.success) {
          cb(callback, { success: false, message: sessionResult.message });
          return;
        }

        // Players still in their lobby grace period move to the in-game one
        players.filter(p => !p.connected).forEach(p => startGameGrace(io, lobbyCode, gameEngine, p.id));

        gameEngine.startRound();
        lobbyStore.updateRoundNumber(lobbyCode, gameEngine.roundNumber);

        let endTime = null;
        if (startResult.settings?.mode === 'timed' && startResult.settings?.timedMinutes) {
          endTime = flow.startGameTimer(io, lobbyCode, startResult.settings.timedMinutes);
        }
        lobby.endTime = endTime;

        const gameState = gameEngine.getGameState();
        io.to(lobbyCode).emit('game:started', { lobbyCode, gameState, settings: startResult.settings, endTime });
        flow.scheduleTurn(io, lobbyCode, gameEngine);
        await flow.emitPrivateHands(io, lobbyCode, gameEngine);

        cb(callback, { success: true, gameState, settings: startResult.settings, endTime });
      } catch (error) {
        logger.error('Error starting game', error);
        cb(callback, { success: false, message: 'Server error' });
      }
    });

    // Bots (SPEC §2.2): host only, waiting lobby
    const hostOnly = (handler) => (...args) => {
      const callback = typeof args[args.length - 1] === 'function' ? args.pop() : null;
      try {
        const { lobbyCode, playerId } = socket.data;
        const lobby = lobbyCode && lobbyStore.getLobby(lobbyCode);
        if (!lobby) return cb(callback, { success: false, message: 'Not in a lobby' });
        if (lobby.host !== playerId) return cb(callback, { success: false, message: 'Only the host can do that' });
        const result = handler(lobbyCode, ...args);
        if (result.success) emitLobbyUpdate(io, lobbyCode);
        cb(callback, result);
      } catch (error) {
        logger.error('Error in host action', error);
        cb(callback, { success: false, message: 'Server error' });
      }
    };

    socket.on('lobby:addBot', hostOnly((lobbyCode) => lobbyStore.addBot(lobbyCode)));
    socket.on('lobby:removeBot', hostOnly((lobbyCode, botId) => lobbyStore.removeBot(lobbyCode, botId)));

    socket.on('lobby:list', (callback) => {
      try {
        cb(callback, { success: true, lobbies: lobbyStore.getAllPublicLobbies() });
      } catch (error) {
        logger.error('Error listing lobbies', error);
        cb(callback, { success: false, lobbies: [] });
      }
    });

    socket.on('game:checkRejoin', (payload, callback) => {
      try {
        const lobbyCode = validate.lobbyCode(payload?.lobbyCode);
        const playerId = presenceStore.resolveToken(payload?.token);
        if (!lobbyCode || !playerId) {
          cb(callback, { canRejoin: false });
          return;
        }
        const engine = sessionStore.getSession(lobbyCode);
        const lobby = lobbyStore.getLobby(lobbyCode);
        const canRejoin = engine
          ? engine.players.some(p => p.id === playerId)
          : !!lobby?.players.some(p => p.id === playerId);
        cb(callback, { canRejoin });
      } catch (error) {
        cb(callback, { canRejoin: false });
      }
    });

    socket.on('game:rejoin', (rawCode, token, callback) => {
      try {
        const lobbyCode = validate.lobbyCode(rawCode);
        const playerId = presenceStore.resolveToken(token);
        if (!lobbyCode || !playerId) {
          // Unknown token: maybe the game finished, otherwise the session is gone
          const finished = lobbyCode && flow.getFinishedGame(lobbyCode);
          cb(callback, finished
            ? { success: false, ended: true, winner: finished.winner, message: 'Game has ended' }
            : { success: false, message: 'Session expired' });
          return;
        }

        const lobby = lobbyStore.getLobby(lobbyCode);
        const gameEngine = sessionStore.getSession(lobbyCode);

        // Running game
        if (gameEngine) {
          const player = gameEngine.players.find(p => p.id === playerId);
          if (!player) {
            cb(callback, { success: false, message: 'Not a member of this game' });
            return;
          }
          if (player.left) {
            const activeCount = gameEngine.players.filter(p => !p.left).length;
            if (activeCount >= MAX_PLAYERS) {
              cb(callback, { success: false, message: 'Game is full' });
              return;
            }
            gameEngine.restorePlayer(playerId);
            lobbyStore.restorePlayer(lobbyCode, playerId, player.name);
          }

          attach(socket, lobbyCode, playerId, player.name);
          player.connected = true;
          lobbyStore.setConnected(lobbyCode, playerId, true);

          const gameState = flow.broadcastState(io, lobbyCode, gameEngine);
          socket.emit('game:hand', player.hand);
          io.to(lobbyCode).emit('player:reconnected', { playerId });

          cb(callback, {
            success: true,
            playerId,
            phase: 'game',
            gameState,
            hand: player.hand,
            settings: lobby?.settings ?? null,
            endTime: lobby?.endTime ?? null,
          });
          return;
        }

        // Waiting lobby
        const lobbyPlayer = lobby?.status === 'waiting' && lobby.players.find(p => p.id === playerId);
        if (lobbyPlayer) {
          attach(socket, lobbyCode, playerId, lobbyPlayer.name);
          lobbyStore.setConnected(lobbyCode, playerId, true);
          emitLobbyUpdate(io, lobbyCode);
          cb(callback, { success: true, playerId, phase: 'lobby', ...lobbyStore.getLobbyView(lobbyCode) });
          return;
        }

        // Recently finished game
        const finished = flow.getFinishedGame(lobbyCode);
        if (finished) {
          cb(callback, { success: false, ended: true, winner: finished.winner, message: 'Game has ended' });
          return;
        }

        cb(callback, { success: false, message: 'Game no longer active' });
      } catch (error) {
        logger.error('Error rejoining', error);
        cb(callback, { success: false, message: 'Server error' });
      }
    });

    socket.on('disconnect', () => {
      logger.log(`User disconnected: ${socket.id}`);
      const { lobbyCode, playerId, playerName } = socket.data;
      if (!lobbyCode || !playerId) return;

      // A newer socket already represents this player: ignore the stale one (SPEC §2.1)
      if (!presenceStore.isCurrentSocket(playerId, socket.id)) return;
      presenceStore.unbind(playerId);
      lobbyStore.setConnected(lobbyCode, playerId, false);

      const gameEngine = sessionStore.getSession(lobbyCode);
      if (gameEngine) {
        const player = gameEngine.players.find(p => p.id === playerId);
        if (!player || player.left) return;
        player.connected = false;
        io.to(lobbyCode).emit('player:disconnected', { playerId, playerName, timeoutMs: config.GAME_GRACE_MS });
        flow.broadcastState(io, lobbyCode, gameEngine); // arms auto-play if it's their turn
        startGameGrace(io, lobbyCode, gameEngine, playerId);
        return;
      }

      if (lobbyStore.getLobby(lobbyCode)) {
        emitLobbyUpdate(io, lobbyCode);
        presenceStore.startGrace(playerId, config.LOBBY_GRACE_MS, () => {
          const lobby = lobbyStore.getLobby(lobbyCode);
          // If the game started meanwhile, the in-game grace period took over
          if (lobby?.status === 'waiting') removeFromLobby(io, lobbyCode, playerId);
        });
      }
    });
  });
};
