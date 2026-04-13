/**
 * gameStore.js - Zustand store for game state
 */

import create from 'zustand';

const useGameStore = create((set) => ({
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

  acceptGameState: (gameData) =>
    set({
      winningCard: gameData.winningCard,
      currentPlayerId: gameData.currentPlayerId,
      players: gameData.players,
      roundNumber: gameData.roundNumber,
      turnOrder: gameData.turnOrder
    }),

  addToHistory: (entry) =>
    set((state) => ({
      history: [...state.history, entry]
    })),

  clearHistory: () => set({ history: [] }),

  reset: () =>
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
      history: []
    })
}));

export default useGameStore;
