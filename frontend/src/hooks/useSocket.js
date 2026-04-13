/**
 * useSocket.js - Custom hook for Socket.IO connection management
 */

import { useEffect } from 'react';
import useSocketStore from '../store/socketStore';

const useSocket = (apiUrl = 'http://localhost:3000') => {
  const { socket, connected, error, connect, disconnect, emit, on, off } =
    useSocketStore();

  useEffect(() => {
    if (!socket) {
      connect(apiUrl);
    }

    return () => {
      // Optionally disconnect on unmount
      // disconnect();
    };
  }, [apiUrl, socket, connect]);

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
