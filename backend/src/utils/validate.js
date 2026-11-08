/**
 * validate.js - Input validation for socket payloads (see docs/SPEC.md §2, §3)
 */

const MAX_NAME_LENGTH = 20;
const GAME_MODES = ['standard', 'short', 'timed'];
const LOBBY_CODE_RE = /^[A-Z0-9]{5}$/;

/** @returns {string|null} trimmed name, or null if invalid */
function playerName(value) {
  if (typeof value !== 'string') return null;
  const name = value.trim();
  if (name.length < 1 || name.length > MAX_NAME_LENGTH) return null;
  return name;
}

/** @returns {string|null} upper-cased code, or null if invalid */
function lobbyCode(value) {
  if (typeof value !== 'string') return null;
  const code = value.trim().toUpperCase();
  return LOBBY_CODE_RE.test(code) ? code : null;
}

/** @returns {{mode, timedMinutes}|null} normalised settings, or null if invalid */
function gameSettings(value) {
  if (value == null) return { mode: 'standard', timedMinutes: null };
  if (typeof value !== 'object') return null;
  const mode = value.mode ?? 'standard';
  if (!GAME_MODES.includes(mode)) return null;
  if (mode !== 'timed') return { mode, timedMinutes: null };
  const minutes = Number(value.timedMinutes);
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 60) return null;
  return { mode, timedMinutes: minutes };
}

/**
 * Card indices for a play: 1–3 distinct integers, each a valid index into a hand
 * of length handSize.
 */
function cardIndices(value, handSize) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 3) return false;
  if (!value.every(i => Number.isInteger(i) && i >= 0 && i < handSize)) return false;
  return new Set(value).size === value.length;
}

const MAX_CHAT_LENGTH = 200;

/** @returns {string|null} cleaned chat text, or null if invalid (SPEC §2.4) */
function chatText(value) {
  if (typeof value !== 'string') return null;
  // eslint-disable-next-line no-control-regex
  const text = value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
  if (text.length < 1 || text.length > MAX_CHAT_LENGTH) return null;
  return text;
}

function isString(value) {
  return typeof value === 'string' && value.length > 0;
}

module.exports = { playerName, lobbyCode, gameSettings, cardIndices, chatText, isString, MAX_NAME_LENGTH, MAX_CHAT_LENGTH };
