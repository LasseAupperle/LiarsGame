/**
 * presenceStore.js - Which socket currently represents each player, and their
 * disconnect grace timers (SPEC §2.1).
 */

const { randomUUID } = require('crypto');

class PresenceStore {
  constructor() {
    this.sockets = {}; // playerId -> latest socket id
    this.timers = {};  // playerId -> grace-period timeout
    this.tokens = {};  // secret token -> playerId (SPEC §2.1)
  }

  /** Create the secret rejoin token for a player. */
  issueToken(playerId) {
    const token = randomUUID();
    this.tokens[token] = playerId;
    return token;
  }

  /** @returns {string|null} playerId for a token */
  resolveToken(token) {
    return (typeof token === 'string' && this.tokens[token]) || null;
  }

  /** A socket now represents this player; cancels any pending grace timer. */
  bind(playerId, socketId) {
    this.sockets[playerId] = socketId;
    this.clearGrace(playerId);
  }

  /** True if this socket is the player's most recent one. */
  isCurrentSocket(playerId, socketId) {
    return this.sockets[playerId] === socketId;
  }

  unbind(playerId) {
    delete this.sockets[playerId];
  }

  startGrace(playerId, ms, onExpire) {
    this.clearGrace(playerId);
    const timer = setTimeout(() => {
      delete this.timers[playerId];
      onExpire();
    }, ms);
    timer.unref?.(); // the HTTP server keeps the process alive, not this timer
    this.timers[playerId] = timer;
  }

  clearGrace(playerId) {
    if (this.timers[playerId]) {
      clearTimeout(this.timers[playerId]);
      delete this.timers[playerId];
    }
  }

  inGrace(playerId) {
    return !!this.timers[playerId];
  }

  /** Player is gone for good (left on purpose / removed from a lobby): drop everything. */
  forget(playerId) {
    this.clearGrace(playerId);
    this.unbind(playerId);
    for (const [token, id] of Object.entries(this.tokens)) {
      if (id === playerId) delete this.tokens[token];
    }
  }
}

module.exports = new PresenceStore();
