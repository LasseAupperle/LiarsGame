const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const logger = require('./utils/logger');
const lobbyEvents = require('./events/lobbyEvents');
const gameEvents = require('./events/gameEvents');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.IO event handlers
lobbyEvents(io);
gameEvents(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  logger.log(`Server running on port ${PORT}`);
});
