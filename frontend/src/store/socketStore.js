/**
 * socketStore.js - Zustand store for Socket.IO connection state.
 *
 * Reconnection behaviour (docs/SPEC.md §2.1):
 * - reconnect forever with backoff (max 5 s);
 * - on every (re)connect, and on app load when a stored session exists,
 *   rejoin the lobby/game automatically;
 * - when the tab becomes visible again (mobile), reconnect immediately.
 */

import { create } from 'zustand';
import io from 'socket.io-client';
import useGameStore from './gameStore';
import useUIStore from './uiStore';

const SESSION_KEY = 'lg_session';

function readStoredSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Rejoin the current (or stored) lobby/game after a (re)connect. */
function rejoinSession(socket) {
  const game = useGameStore.getState();
  if (game.status === 'won') return;

  const stored = readStoredSession();
  const session = game.gameCode && game.sessionToken
    ? { gameCode: game.gameCode, sessionToken: game.sessionToken, playerName: game.playerName }
    : stored;
  if (!session?.gameCode || !session?.sessionToken) return;

  const hadGameInMemory = !!game.gameCode;

  socket.emit('game:rejoin', session.gameCode, session.sessionToken, (res) => {
    const g = useGameStore.getState();

    if (res?.success) {
      g.setGameCode(session.gameCode);
      g.setPlayerId(res.playerId);
      g.setSessionToken(session.sessionToken);
      if (session.playerName) g.setPlayerName(session.playerName);

      if (res.phase === 'game') {
        g.acceptGameState(res.gameState);
        g.setMyHand(res.hand || []);
        if (res.settings) g.setGameSettings(res.settings, res.endTime || null);
        g.setStatus('playing');
      } else {
        g.setPlayers(res.players || []);
        if (res.settings) g.setGameSettings(res.settings);
        g.setStatus('lobby');
      }
      g.saveSession();
      return;
    }

    // Game finished while we were away: show the result
    if (res?.ended && res.winner) {
      g.setGameCode(session.gameCode);
      if (session.playerId) g.setPlayerId(session.playerId);
      g.setWinner(res.winner);
      g.setStatus('won');
      return;
    }

    // Session is gone: back to the main menu
    if (hadGameInMemory) {
      g.reset();
      useUIStore.getState().reset();
    } else {
      g.clearSession();
    }
  });
}

const useSocketStore = create((set, get) => ({
  socket: null,
  connected: false,
  error: null,

  connect: (apiUrl) => {
    const socket = io(apiUrl || 'http://localhost:3000', {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });

    socket.on('connect', () => {
      set({ connected: true, error: null });
      rejoinSession(socket);
    });

    socket.on('disconnect', (reason) => {
      set({ connected: false });
      // The server closed the connection on purpose: socket.io won't retry by itself
      if (reason === 'io server disconnect') socket.connect();
    });

    socket.on('connect_error', (error) => {
      set({ error: error.message });
    });

    // Mobile browsers freeze background tabs; reconnect as soon as we're visible again
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && !socket.connected) socket.connect();
      });
    }

    set({ socket });
    return socket;
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, connected: false });
    }
  },

  /**
   * Emit an event. While disconnected the event is not sent and the
   * acknowledgement callback (if any) gets a failure instead of never firing.
   */
  emit: (event, ...args) => {
    const { socket } = get();
    if (socket && get().connected) {
      socket.emit(event, ...args);
      return;
    }
    const callback = args[args.length - 1];
    if (typeof callback === 'function') {
      callback({ success: false, message: 'Not connected — reconnecting…' });
    }
  },

  on: (event, handler) => {
    const { socket } = get();
    if (socket) {
      socket.on(event, handler);
    }
  },

  off: (event, handler) => {
    const { socket } = get();
    if (socket) {
      socket.off(event, handler);
    }
  }
}));

export default useSocketStore;
