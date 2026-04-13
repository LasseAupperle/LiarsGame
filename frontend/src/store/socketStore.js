/**
 * socketStore.js - Zustand store for Socket.IO connection state
 */

import create from 'zustand';
import io from 'socket.io-client';

const useSocketStore = create((set, get) => ({
  socket: null,
  connected: false,
  error: null,

  connect: (apiUrl) => {
    const socket = io(apiUrl || 'http://localhost:3000', {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    socket.on('connect', () => {
      set({ connected: true, error: null });
      console.log('Socket connected:', socket.id);
    });

    socket.on('disconnect', () => {
      set({ connected: false });
      console.log('Socket disconnected');
    });

    socket.on('connect_error', (error) => {
      set({ error: error.message });
      console.error('Socket connection error:', error);
    });

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

  emit: (event, data) => {
    const { socket } = get();
    if (socket && get().connected) {
      socket.emit(event, data);
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
