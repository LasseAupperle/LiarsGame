/**
 * useGame.js - Combined hook for game logic
 */

import useGameStore from '../store/gameStore';
import useUIStore from '../store/uiStore';
import useSocket from './useSocket';

const useGame = () => {
  const gameStore = useGameStore();
  const uiStore = useUIStore();
  const socketHook = useSocket();

  return {
    // Game state
    gameCode: gameStore.gameCode,
    playerId: gameStore.playerId,
    playerName: gameStore.playerName,
    status: gameStore.status,
    players: gameStore.players,
    winningCard: gameStore.winningCard,
    currentPlayerId: gameStore.currentPlayerId,
    history: gameStore.history,
    roundNumber: gameStore.roundNumber,
    isYourTurn: gameStore.currentPlayerId === gameStore.playerId,

    // Game actions
    ...gameStore,

    // UI state
    ...uiStore,

    // Socket
    ...socketHook
  };
};

export default useGame;
