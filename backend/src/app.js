/**
 * app.js - Builds the Express + Socket.IO server without listening,
 * so tests can start it on an ephemeral port.
 */
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const lobbyEvents = require('./events/lobbyEvents');
const gameEvents = require('./events/gameEvents');

/**
 * CORS_ORIGIN: comma-separated list of allowed origins, e.g.
 * "http://localhost:5173,https://liars.netlify.app". Unset = allow all (dev only).
 */
function parseOrigins(value) {
  if (!value || value.trim() === '*') return '*';
  const list = value.split(',').map(o => o.trim().replace(/\/$/, '')).filter(Boolean);
  return list.length === 1 ? list[0] : list;
}

function createApp({ corsOrigin = process.env.CORS_ORIGIN } = {}) {
  const origin = parseOrigins(corsOrigin);
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin, methods: ['GET', 'POST'] }
  });

  app.use(cors({ origin }));
  app.use(express.json());

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  lobbyEvents(io);
  gameEvents(io);

  return { app, server, io };
}

module.exports = { createApp, parseOrigins };
