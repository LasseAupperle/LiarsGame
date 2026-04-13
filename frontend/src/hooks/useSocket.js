/**
 * useSocket.js - Custom hook for Socket.IO connection management
 */

import { useEffect } from 'react';
import useSocketStore from '../store/socketStore';

const useSocket = (apiUrl) => {
  // Use provided URL, or read from env, or default to localhost
  const url = apiUrl || import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const { socket, connected, error, connect, disconnect, emit, on, off } =
    useSocketStore();

  useEffect(() => {
    if (!socket) {
      connect(url);
    }

    return () => {
      // Optionally disconnect on unmount
      // disconnect();
    };
  }, [url, socket, connect]);

  return {
    socket,
    connected,
    error,
    emit,
    on,
    off,
    disconnect
  };
};

export default useSocket;
