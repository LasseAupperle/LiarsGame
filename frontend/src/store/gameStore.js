/**
 * gameStore.js - Zustand store for game state
 */

import { create } from 'zustand';

const SESSION_KEY = 'lg_session';

const useGameStore = create((set, get) => ({
  // Game state
  gameCode: null,
  playerId: null,
  playerName: null,
  status: 'lobby', // lobby | playing | won | spectating

  // Players & their data
  players: [],

  // Round state
  winningCard: null,
  currentPlayerId: null,
  turnOrder: [],
  bonusModifier: 0,
  roundNumber: 0,

  // History
  history: [],

  // My private hand
  myHand: [],

  // Winner data
  winner: null,

  // Game settings (mode, scoreThreshold, timedMinutes) + timer end time
  gameSettings: null,
  gameEndTime: null,

  // Actions
  setGameCode: (code) => set({ gameCode: code }),
  setPlayerId: (id) => set({ playerId: id }),
  setPlayerName: (name) => set({ playerName: name }),
  setStatus: (status) => set({ status }),
  setPlayers: (players) => set({ players }),
  setWinningCard: (card) => set({ winningCard: card }),
  setCurrentPlayerId: (id) => set({ currentPlayerId: id }),
  setRoundNumber: (num) => set({ roundNumber: num }),
  setBonusModifier: (mod) => set({ bonusModifier: mod }),
  setTurnOrder: (order) => set({ turnOrder: order }),
  setMyHand: (hand) => set({ myHand: hand }),
  setWinner: (winner) => set({ winner }),
  setGameSettings: (settings, endTime = null) => set({ gameSettings: settings, gameEndTime: endTime }),

  acceptGameState: (gameData) =>
    set({
      winningCard: gameData.winningCard,
      currentPlayerId: gameData.currentPlayerId,
      players: gameData.players,
      roundNumber: gameData.roundNumber,
      turnOrder: gameData.turnOrder,
      history: gameData.playHistory || []
    }),

  addToHistory: (entry) =>
    set((state) => ({
      history: [...state.history, entry]
    })),

  clearHistory: () => set({ history: [] }),

  saveSession: () => {
    const { gameCode, playerId, playerName } = get();
    if (gameCode && playerId && playerName) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ gameCode, playerId, playerName }));
    }
  },

  clearSession: () => {
    localStorage.removeItem(SESSION_KEY);
  },

  reset: () => {
    localStorage.removeItem(SESSION_KEY);
    set({
      gameCode: null,
      playerId: null,
      playerName: null,
      status: 'lobby',
      players: [],
      winningCard: null,
      currentPlayerId: null,
      turnOrder: [],
      bonusModifier: 0,
      roundNumber: 0,
      history: [],
      myHand: [],
      winner: null,
      gameSettings: null,
      gameEndTime: null,
    });
  }
}));

export default useGameStore;
