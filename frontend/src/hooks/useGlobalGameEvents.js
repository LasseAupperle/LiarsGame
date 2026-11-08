/**
 * useGlobalGameEvents.js - Socket listeners that must work on every screen.
 *
 * `game:started` can arrive while a player is in the lobby room *or* still on the
 * result screen of the previous game (rematch, SPEC §2.3) — either way they're dealt in.
 */
import { useEffect } from 'react';
import useSocketStore from '../store/socketStore';
import useGameStore from '../store/gameStore';
import useUIStore from '../store/uiStore';

export default function useGlobalGameEvents() {
  const socket = useSocketStore((s) => s.socket);

  useEffect(() => {
    if (!socket) return;

    const handleGameStarted = (data) => {
      const game = useGameStore.getState();
      if (!data?.gameState || data.lobbyCode !== game.gameCode) return;
      game.resetGameState();
      useUIStore.getState().resetGameUI();
      game.acceptGameState(data.gameState);
      if (data.settings) game.setGameSettings(data.settings, data.endTime || null);
      game.setStatus('playing');
    };

    const handleHand = (hand) => useGameStore.getState().setMyHand(hand);
    const handleChat = (message) => {
      const { gameCode, playerId } = useGameStore.getState();
      if (gameCode) useUIStore.getState().addChatMessage(gameCode, message, playerId);
    };

    socket.on('game:started', handleGameStarted);
    socket.on('game:hand', handleHand);
    socket.on('chat:message', handleChat);
    return () => {
      socket.off('game:started', handleGameStarted);
      socket.off('game:hand', handleHand);
      socket.off('chat:message', handleChat);
    };
  }, [socket]);

}
