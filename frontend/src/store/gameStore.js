/**
 * gameStore.js - Zustand store for game state
 */

import { create } from 'zustand';

const SESSION_KEY = 'lg_session';

const useGameStore = create((set, get) => ({
  // Game state
  gameCode: null,
  playerId: null,      // public id (visible to everyone)
  sessionToken: null,  // secret rejoin token (SPEC §2.1) — never share
  playerName: null,
  status: 'lobby', // lobby | playing | won | spectating

  // Players & their data
  players: [],
  hostId: null, // lobby host (always a human)

  // Round state
  winningCard: null,
  currentPlayerId: null,
  turnOrder: [],
  bonus: 0, // shared bonus pot (SPEC §1.6)
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
  setSessionToken: (token) => set({ sessionToken: token }),
  setPlayerName: (name) => set({ playerName: name }),
  setStatus: (status) => set({ status }),
  setPlayers: (players) => set({ players }),
  setHostId: (hostId) => set({ hostId }),
  setWinningCard: (card) => set({ winningCard: card }),
  setCurrentPlayerId: (id) => set({ currentPlayerId: id }),
  setRoundNumber: (num) => set({ roundNumber: num }),
  setTurnOrder: (order) => set({ turnOrder: order }),
  setMyHand: (hand) => set({ myHand: hand }),
  // A finished game can't be rejoined: drop the stored session so a reload goes to the menu
  setWinner: (winner) => {
    localStorage.removeItem(SESSION_KEY);
    set({ winner });
  },
  setGameSettings: (settings, endTime = null) => set({ gameSettings: settings, gameEndTime: endTime }),

  acceptGameState: (gameData) =>
    set({
      winningCard: gameData.winningCard,
      currentPlayerId: gameData.currentPlayerId,
      players: gameData.players,
      roundNumber: gameData.roundNumber,
      bonus: gameData.bonus ?? 0,
      turnOrder: gameData.turnOrder,
      history: gameData.playHistory || []
    }),

  addToHistory: (entry) =>
    set((state) => ({
      history: [...state.history, entry]
    })),

  clearHistory: () => set({ history: [] }),

  saveSession: () => {
    const { gameCode, playerId, sessionToken, playerName } = get();
    if (gameCode && sessionToken && playerName) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ gameCode, playerId, sessionToken, playerName }));
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
      sessionToken: null,
      playerName: null,
      status: 'lobby',
      players: [],
      hostId: null,
      winningCard: null,
      currentPlayerId: null,
      turnOrder: [],
      bonus: 0,
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
