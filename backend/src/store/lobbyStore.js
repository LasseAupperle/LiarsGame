/**
 * lobbyStore.js - In-memory lobby management
 */

const logger = require('../utils/logger');

class LobbyStore {
  constructor() {
    this.lobbies = {}; // { lobbyCode: { players[], status, createdAt } }
  }

  createLobby(lobbyCode, playerName, playerId) {
    if (this.lobbies[lobbyCode]) {
      return { success: false, message: 'Lobby already exists' };
    }

    this.lobbies[lobbyCode] = {
      code: lobbyCode,
      players: [{ id: playerId, name: playerName }],
      status: 'waiting', // waiting | playing | finished
      createdAt: Date.now(),
      host: playerId
    };

    logger.log(`Lobby created: ${lobbyCode}`);
    return { success: true, lobbyCode };
  }

  joinLobby(lobbyCode, playerName, playerId) {
    const lobby = this.lobbies[lobbyCode];
    if (!lobby) {
      return { success: false, message: 'Lobby not found' };
    }

    if (lobby.status !== 'waiting') {
      return { success: false, message: 'Game already started' };
    }

    if (lobby.players.length >= 4) {
      return { success: false, message: 'Lobby is full' };
    }

    if (lobby.players.some(p => p.id === playerId)) {
      return { success: false, message: 'Already in lobby' };
    }

    lobby.players.push({ id: playerId, name: playerName });
    logger.log(`${playerName} joined lobby ${lobbyCode}`);
    return { success: true, lobbyCode, players: lobby.players };
  }

  leaveLobby(lobbyCode, playerId) {
    const lobby = this.lobbies[lobbyCode];
    if (!lobby) {
      return { success: false, message: 'Lobby not found' };
    }

    lobby.players = lobby.players.filter(p => p.id !== playerId);

    if (lobby.players.length === 0) {
      delete this.lobbies[lobbyCode];
      logger.log(`Lobby deleted: ${lobbyCode}`);
    } else if (lobby.host === playerId && lobby.status === 'waiting') {
      lobby.host = lobby.players[0].id;
      logger.log(`New host for lobby ${lobbyCode}: ${lobby.host}`);
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
    return { success: true, players: lobby.players };
  }

  getLobby(lobbyCode) {
    return this.lobbies[lobbyCode] || null;
  }

  getAllLobbies() {
    return this.lobbies;
  }
}

module.exports = new LobbyStore();
