/**
 * logger.js - Simple logging utility
 */

// Quiet under `node --test` (it sets NODE_TEST_CONTEXT) or NODE_ENV=test
const silent = process.env.NODE_ENV === 'test' || !!process.env.NODE_TEST_CONTEXT;

function log(message) {
  if (silent) return;
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function error(message, err) {
  console.error(`[${new Date().toISOString()}] ERROR: ${message}`, err);
}

function warn(message) {
  if (silent) return;
  console.warn(`[${new Date().toISOString()}] WARN: ${message}`);
}

module.exports = {
  log,
  error,
  warn
};
