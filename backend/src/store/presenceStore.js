/**
 * presenceStore.js - Which socket currently represents each player, and their
 * disconnect grace timers (SPEC §2.1).
 */

class PresenceStore {
  constructor() {
    this.sockets = {}; // playerId -> latest socket id
    this.timers = {};  // playerId -> grace-period timeout
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

  forget(playerId) {
    this.clearGrace(playerId);
    this.unbind(playerId);
  }
}

module.exports = new PresenceStore();
