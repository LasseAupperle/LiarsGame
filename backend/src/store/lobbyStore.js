/**
 * lobbyStore.js - In-memory lobby management
 */

const { randomUUID } = require('crypto');
const logger = require('../utils/logger');

const MAX_PLAYERS = 4;
const BOT_NAMES = ['Ada', 'Max', 'Lou', 'Zed', 'Kit', 'Rex', 'Ivy', 'Bo'];
const humans = (lobby) => lobby.players.filter(p => !p.isBot);

class LobbyStore {
  constructor() {
    this.lobbies = {}; // { lobbyCode: { players[], status, createdAt } }
  }

  createLobby(lobbyCode, playerName, playerId, settings = {}) {
    if (this.lobbies[lobbyCode]) {
      return { success: false, message: 'Lobby already exists' };
    }

    this.lobbies[lobbyCode] = {
      code: lobbyCode,
      players: [{ id: playerId, name: playerName, connected: true }],
      status: 'waiting', // waiting | playing | finished
      createdAt: Date.now(),
      host: playerId,
      settings: { mode: settings.mode || 'standard', timedMinutes: settings.timedMinutes || null },
    };

    logger.log(`Lobby created: ${lobbyCode}`);
    return { success: true, lobbyCode };
  }

  joinLobby(lobbyCode, playerName, playerId) {
    const lobby = this.lobbies[lobbyCode];
    if (!lobby) {
      return { success: false, message: 'Lobby not found' };
    }

    // Names are unique per lobby, case-insensitive (SPEC §2)
    const taken = lobby.players.some(p => p.name.toLowerCase() === playerName.toLowerCase());
    if (taken) {
      return { success: false, message: 'That name is already taken in this lobby' };
    }

    if (lobby.status === 'playing') {
      if (lobby.players.length >= MAX_PLAYERS) {
        return { success: false, message: 'Game is full' };
      }
      lobby.players.push({ id: playerId, name: playerName, connected: true });
      logger.log(`${playerName} joined running game ${lobbyCode}`);
      return { success: true, lobbyCode, players: lobby.players, joinedRunning: true };
    }

    if (lobby.status !== 'waiting') {
      return { success: false, message: 'Game already started' };
    }

    if (lobby.players.length >= MAX_PLAYERS) {
      // A human takes the seat of the most recently added bot (SPEC §2.2)
      const lastBot = [...lobby.players].reverse().find(p => p.isBot);
      if (!lastBot) return { success: false, message: 'Lobby is full' };
      lobby.players = lobby.players.filter(p => p.id !== lastBot.id);
      logger.log(`${playerName} replaces bot ${lastBot.name} in ${lobbyCode}`);
    }

    if (lobby.players.some(p => p.id === playerId)) {
      return { success: false, message: 'Already in lobby' };
    }

    lobby.players.push({ id: playerId, name: playerName, connected: true });
    logger.log(`${playerName} joined lobby ${lobbyCode}`);
    return { success: true, lobbyCode, players: lobby.players };
  }

  leaveLobby(lobbyCode, playerId) {
    const lobby = this.lobbies[lobbyCode];
    if (!lobby) {
      return { success: false, message: 'Lobby not found' };
    }

    lobby.players = lobby.players.filter(p => p.id !== playerId);

    // Bots alone never keep a lobby alive; the host is always a human (SPEC §2)
    if (humans(lobby).length === 0) {
      delete this.lobbies[lobbyCode];
      logger.log(`Lobby deleted: ${lobbyCode}`);
    } else if (lobby.host === playerId) {
      lobby.host = humans(lobby)[0].id;
      logger.log(`New host for lobby ${lobbyCode}: ${lobby.host}`);
    }

    return { success: true };
  }

  deleteLobby(lobbyCode) {
    if (this.lobbies[lobbyCode]) {
      delete this.lobbies[lobbyCode];
      logger.log(`Lobby force-deleted: ${lobbyCode}`);
    }
    return { success: true };
  }

  startGame(lobbyCode) {
    const lobby = this.lobbies[lobbyCode];
    if (!lobby) {
      return { success: false, message: 'Lobby not found' };
    }

    if (lobby.players.length < 2 || lobby.players.length > 4) {
      return { success: false, message: 'Invalid player count (2-4 required)' };
    }

    lobby.status = 'playing';
    logger.log(`Game started in lobby ${lobbyCode} with ${lobby.players.length} players`);
    return { success: true, players: lobby.players, settings: lobby.settings };
  }

  /** Add a bot to a waiting lobby (SPEC §2.2). */
  addBot(lobbyCode) {
    const lobby = this.lobbies[lobbyCode];
    if (!lobby) return { success: false, message: 'Lobby not found' };
    if (lobby.status !== 'waiting') return { success: false, message: 'Game already started' };
    if (lobby.players.length >= MAX_PLAYERS) return { success: false, message: 'Lobby is full' };

    const taken = new Set(lobby.players.map(p => p.name.toLowerCase()));
    const base = BOT_NAMES.find(n => !taken.has(`${n} (bot)`.toLowerCase())) || 'Bot';
    const bot = { id: `bot-${randomUUID()}`, name: `${base} (bot)`, connected: true, isBot: true };
    lobby.players.push(bot);
    logger.log(`Bot ${bot.name} added to ${lobbyCode}`);
    return { success: true, bot };
  }

  removeBot(lobbyCode, botId) {
    const lobby = this.lobbies[lobbyCode];
    if (!lobby) return { success: false, message: 'Lobby not found' };
    if (lobby.status !== 'waiting') return { success: false, message: 'Game already started' };
    if (!lobby.players.some(p => p.id === botId && p.isBot)) return { success: false, message: 'Bot not found' };
    lobby.players = lobby.players.filter(p => p.id !== botId);
    return { success: true };
  }

  /** Mark a lobby player's connection state (SPEC §2.1). */
  setConnected(lobbyCode, playerId, connected) {
    const player = this.lobbies[lobbyCode]?.players.find(p => p.id === playerId);
    if (player) player.connected = connected;
  }

  /** Re-add a player removed from a running game who rejoined. */
  restorePlayer(lobbyCode, playerId, playerName) {
    const lobby = this.lobbies[lobbyCode];
    if (lobby && !lobby.players.some(p => p.id === playerId)) {
      lobby.players.push({ id: playerId, name: playerName, connected: true });
    }
  }

  /** Payload for lobby:updated */
  getLobbyView(lobbyCode) {
    const lobby = this.lobbies[lobbyCode];
    if (!lobby) return null;
    return { lobbyCode, host: lobby.host, players: lobby.players, settings: lobby.settings };
  }

  getLobby(lobbyCode) {
    return this.lobbies[lobbyCode] || null;
  }

  getPublicLobbies() {
    return Object.values(this.lobbies)
      .filter(l => l.status === 'waiting' && l.players.length < 4)
      .map(l => ({
        code: l.code,
        playerCount: l.players.length,
        maxPlayers: 4
      }));
  }

  getAllPublicLobbies() {
    return Object.values(this.lobbies).map(l => ({
      code: l.code,
      playerCount: l.players.length,
      maxPlayers: 4,
      status: l.status,
      roundNumber: l.roundNumber ?? null,
    }));
  }

  updateRoundNumber(lobbyCode, roundNumber) {
    if (this.lobbies[lobbyCode]) {
      this.lobbies[lobbyCode].roundNumber = roundNumber;
    }
  }

  getAllLobbies() {
    return this.lobbies;
  }
}

module.exports = new LobbyStore();
