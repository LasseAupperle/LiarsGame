/**
 * config.js - Timing constants (SPEC §2.1). Mutable so tests can shorten them.
 */
const num = (name, fallback) => Number(process.env[name]) || fallback;

module.exports = {
  GAME_GRACE_MS: num('GAME_GRACE_MS', 120000),       // in-game disconnect grace period
  LOBBY_GRACE_MS: num('LOBBY_GRACE_MS', 60000),      // waiting-lobby disconnect grace period
  AUTO_PLAY_MS: num('AUTO_PLAY_MS', 15000),          // auto-play delay for a disconnected current player
  BOT_MIN_MS: num('BOT_MIN_MS', 1000),               // bot think time range
  BOT_MAX_MS: num('BOT_MAX_MS', 2500),
  FINISHED_GAME_TTL_MS: num('FINISHED_GAME_TTL_MS', 10 * 60 * 1000), // remember results for rejoiners
};
