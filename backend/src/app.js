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

function createApp({ corsOrigin = process.env.CORS_ORIGIN } = {}) {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: corsOrigin || '*',
      methods: ['GET', 'POST']
    }
  });

  app.use(cors());
  app.use(express.json());

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  lobbyEvents(io);
  gameEvents(io);

  return { app, server, io };
}

module.exports = { createApp };
