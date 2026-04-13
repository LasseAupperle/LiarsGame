/**
 * uiStore.js - Zustand store for UI state
 */

import create from 'zustand';

const useUIStore = create((set) => ({
  // UI state
  selectedCards: [],
  showModal: null, // play-confirm | liar-confirm | card-select | error
  soundEnabled: true,
  showRules: false,
  error: null,

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

  setShowRules: (show) => set({ showRules: show }),

  setError: (error) => set({ error }),

  clearError: () => set({ error: null }),

  reset: () =>
    set({
      selectedCards: [],
      showModal: null,
      soundEnabled: true,
      showRules: false,
      error: null
    })
}));

export default useUIStore;
