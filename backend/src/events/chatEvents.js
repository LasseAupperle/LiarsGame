/**
 * chatEvents.js - Lobby/game chat (SPEC §2.4)
 */

const { randomUUID } = require('crypto');
const lobbyStore = require('../store/lobbyStore');
const sessionStore = require('../store/sessionStore');
const validate = require('../utils/validate');
const logger = require('../utils/logger');
const flow = require('./gameFlow');

const RATE_LIMIT = 5;           // messages
const RATE_WINDOW_MS = 10000;   // per 10 s per player
const recentSends = {};         // playerId -> timestamps

const cb = (callback, data) => {
  if (typeof callback === 'function') callback(data);
};

function postMessage(io, lobbyCode, { playerId, playerName, text, isBot = false }) {
  const message = { id: randomUUID(), playerId, playerName, text, ts: Date.now(), isBot };
  lobbyStore.addChatMessage(lobbyCode, message);
  io.to(lobbyCode).emit('chat:message', message);
  return message;
}

function rateLimited(playerId) {
  const now = Date.now();
  const recent = (recentSends[playerId] || []).filter(t => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    recentSends[playerId] = recent;
    return true;
  }
  recent.push(now);
  recentSends[playerId] = recent;
  return false;
}

/** Find the sender's display name in the lobby or the running game. */
function senderName(lobbyCode, playerId) {
  const engine = sessionStore.getSession(lobbyCode);
  return engine?.players.find(p => p.id === playerId)?.name
    ?? lobbyStore.getLobby(lobbyCode)?.players.find(p => p.id === playerId)?.name
    ?? null;
}

// ---------- bot banter after liar calls ----------

const LINES = {
  callerRight: ['Gotcha! 😏', 'Called it.', 'Nice try 😄', 'I knew it!'],
  callerWrong: ['Hmm… my bad.', 'Okay, okay, you were honest 🙃', 'Ouch.'],
  accusedCaught: ['Worth a shot 😅', 'Busted.', 'You saw right through me'],
  accusedHonest: ['Told you so 😇', 'Honest as always!', 'Never doubt me 😎'],
};
const pick = (list) => list[Math.floor(Math.random() * list.length)];

function botBanter(io, lobbyCode, { accused, caller, isLiarCorrect }) {
  const candidates = [];
  if (caller?.isBot) candidates.push([caller, isLiarCorrect ? LINES.callerRight : LINES.callerWrong]);
  if (accused?.isBot) candidates.push([accused, isLiarCorrect ? LINES.accusedCaught : LINES.accusedHonest]);
  if (candidates.length === 0 || Math.random() > 0.5) return;

  const [bot, lines] = pick(candidates);
  const timer = setTimeout(() => {
    if (!lobbyStore.getLobby(lobbyCode)) return;
    postMessage(io, lobbyCode, { playerId: bot.id, playerName: bot.name, text: pick(lines), isBot: true });
  }, 600 + Math.random() * 600);
  timer.unref?.();
}

module.exports = (io) => {
  flow.setLiarResolvedHook((ioRef, lobbyCode, info) => botBanter(ioRef, lobbyCode, info));

  io.on('connection', (socket) => {
    socket.on('chat:send', (rawText, callback) => {
      try {
        const { lobbyCode, playerId } = socket.data;
        if (!lobbyCode || !playerId || !lobbyStore.getLobby(lobbyCode)) {
          cb(callback, { success: false, message: 'Not in a lobby' });
          return;
        }
        const text = validate.chatText(rawText);
        if (!text) {
          cb(callback, { success: false, message: `Message must be 1-${validate.MAX_CHAT_LENGTH} characters` });
          return;
        }
        const playerName = senderName(lobbyCode, playerId);
        if (!playerName) {
          cb(callback, { success: false, message: 'Not in a lobby' });
          return;
        }
        if (rateLimited(playerId)) {
          cb(callback, { success: false, message: 'Slow down a little' });
          return;
        }
        postMessage(io, lobbyCode, { playerId, playerName, text });
        cb(callback, { success: true });
      } catch (error) {
        logger.error('Error sending chat', error);
        cb(callback, { success: false, message: 'Server error' });
      }
    });
  });
};
