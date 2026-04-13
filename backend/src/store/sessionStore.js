/**
 * sessionStore.js - Active game sessions management
 */

const logger = require('../utils/logger');

class SessionStore {
  constructor() {
    this.sessions = {}; // { lobbyCode: GameEngine instance }
  }

  createSession(lobbyCode, gameEngine) {
    if (this.sessions[lobbyCode]) {
      return { success: false, message: 'Session already exists' };
    }

    this.sessions[lobbyCode] = gameEngine;
    logger.log(`Game session created: ${lobbyCode}`);
    return { success: true };
  }

  getSession(lobbyCode) {
    return this.sessions[lobbyCode] || null;
  }

  deleteSession(lobbyCode) {
    if (this.sessions[lobbyCode]) {
      delete this.sessions[lobbyCode];
      logger.log(`Game session ended: ${lobbyCode}`);
      return { success: true };
    }
    return { success: false, message: 'Session not found' };
  }

  getAllSessions() {
    return this.sessions;
  }
}

module.exports = new SessionStore();
