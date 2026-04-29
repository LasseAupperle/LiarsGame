/**
 * uiStore.js - Zustand store for UI state
 */

import { create } from 'zustand';

const useUIStore = create((set) => ({
  // UI state
  selectedCards: [],
  showModal: null, // play-confirm | liar-confirm | card-select | error
  soundEnabled: true,
  cardsHidden: false,
  showRules: false,
  error: null,
  disconnectedPlayers: [], // [{ playerId, playerName }]

  tableDisplay: {
    count: 0,
    revealed: false,
    noLiar: false,
    cards: null,
    accusedName: null,
    callerName: null,
    isLiarCorrect: null,
    scoreDeltas: null,
    scores: null,
  },

  discardPile: [],      // [{ count, cards, isLiarCorrect, accusedName, noLiar }]
  roundTransition: null, // { roundNumber, lastResult } | null

  // Actions
  toggleCard: (cardId) =>
    set((state) => {
      const newSelected = state.selectedCards.includes(cardId)
        ? state.selectedCards.filter((c) => c !== cardId)
        : [...state.selectedCards, cardId];
      return { selectedCards: newSelected };
    }),

  clearSelection: () => set({ selectedCards: [] }),

  openModal: (modalType) => set({ showModal: modalType }),

  closeModal: () => set({ showModal: null }),

  toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),

  toggleCardsHidden: () => set((state) => ({ cardsHidden: !state.cardsHidden })),

  addDisconnectedPlayer: (player) =>
    set((state) => ({ disconnectedPlayers: [...state.disconnectedPlayers, player] })),

  removeDisconnectedPlayer: (playerId) =>
    set((state) => ({
      disconnectedPlayers: state.disconnectedPlayers.filter(p => p.playerId !== playerId)
    })),

  setTableDisplay: (data) =>
    set((state) => ({ tableDisplay: { ...state.tableDisplay, ...data } })),

  clearTableDisplay: () =>
    set({
      tableDisplay: {
        count: 0, revealed: false, noLiar: false, cards: null,
        accusedName: null, callerName: null,
        isLiarCorrect: null, scoreDeltas: null, scores: null,
      }
    }),

  addToDiscardPile: (entry) =>
    set((state) => ({ discardPile: [...state.discardPile, entry] })),

  clearDiscardPile: () => set({ discardPile: [] }),

  setRoundTransition: (data) => set({ roundTransition: data }),

  clearRoundTransition: () => set({ roundTransition: null }),

  setShowRules: (show) => set({ showRules: show }),

  setError: (error) => set({ error }),

  clearError: () => set({ error: null }),

  reset: () =>
    set({
      selectedCards: [],
      showModal: null,
      soundEnabled: true,
      cardsHidden: false,
      showRules: false,
      error: null,
      disconnectedPlayers: [],
      discardPile: [],
      roundTransition: null,
      tableDisplay: {
        count: 0, revealed: false, noLiar: false, cards: null,
        accusedName: null, callerName: null,
        isLiarCorrect: null, scoreDeltas: null, scores: null,
      }
    })
}));

export default useUIStore;
