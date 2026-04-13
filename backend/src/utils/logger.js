/**
 * logger.js - Simple logging utility
 */

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function error(message, err) {
  console.error(`[${new Date().toISOString()}] ERROR: ${message}`, err);
}

function warn(message) {
  console.warn(`[${new Date().toISOString()}] WARN: ${message}`);
}

module.exports = {
  log,
  error,
  warn
};
