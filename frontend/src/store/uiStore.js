/**
 * uiStore.js - Zustand store for UI state
 */

import { create } from 'zustand';

const useUIStore = create((set) => ({
  // UI state
  selectedCards: [],
  showModal: null, // play-confirm | liar-confirm | card-select | error
  soundEnabled: true,
  volume: 1,
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

  setVolume: (v) => set({ volume: Math.max(0, Math.min(1, v)) }),

  toggleCardsHidden: () => set((state) => ({ cardsHidden: !state.cardsHidden })),

  // Chat (SPEC §2.4)
  // Messages belong to chatLobby; a different lobby starts an empty chat.
  chatMessages: [], // [{ id, playerId, playerName, text, ts, isBot }]
  chatLobby: null,
  chatOpen: false,
  chatUnread: 0,
  setChat: (lobbyCode, messages) =>
    set({ chatLobby: lobbyCode, chatMessages: (messages || []).slice(-50), chatUnread: 0 }),
  addChatMessage: (lobbyCode, message, myId) =>
    set((state) => {
      const current = state.chatLobby === lobbyCode ? state.chatMessages : [];
      if (current.some(m => m.id === message.id)) return {};
      const unread = !state.chatOpen && message.playerId !== myId ? 1 : 0;
      return {
        chatLobby: lobbyCode,
        chatMessages: [...current, message].slice(-50),
        chatUnread: (state.chatLobby === lobbyCode ? state.chatUnread : 0) + unread,
      };
    }),
  setChatOpen: (open) => set(open ? { chatOpen: true, chatUnread: 0 } : { chatOpen: false }),
  clearChat: () => set({ chatMessages: [], chatLobby: null, chatUnread: 0, chatOpen: false }),

  // Toasts: non-blocking notifications (replaces alert())
  toasts: [], // [{ id, message, type: 'info' | 'success' | 'error' }]
  showToast: (message, type = 'info', durationMs = 3500) => {
    const id = Date.now() + Math.random();
    set((state) => ({ toasts: [...state.toasts.slice(-3), { id, message, type }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter(t => t.id !== id) }));
    }, durationMs);
    return id;
  },
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter(t => t.id !== id) })),

  addDisconnectedPlayer: (player) =>
    set((state) => ({
      disconnectedPlayers: [
        ...state.disconnectedPlayers.filter(p => p.playerId !== player.playerId),
        player
      ]
    })),

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

  /** Clear per-game UI (table, discard pile, overlays) but keep preferences like volume. */
  resetGameUI: () =>
    set({
      selectedCards: [],
      disconnectedPlayers: [],
      discardPile: [],
      roundTransition: null,
      tableDisplay: {
        count: 0, revealed: false, noLiar: false, cards: null,
        accusedName: null, callerName: null,
        isLiarCorrect: null, scoreDeltas: null, scores: null,
      }
    }),

  reset: () =>
    set({
      selectedCards: [],
      showModal: null,
      soundEnabled: true,
      volume: 1,
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

/** Show a toast from anywhere (also outside React components). */
export const toast = (message, type = 'info', durationMs) =>
  useUIStore.getState().showToast(message, type, durationMs);
