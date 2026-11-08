import { describe, it, expect, beforeEach, vi } from 'vitest';
import useGameStore from '../gameStore';
import useUIStore, { toast } from '../uiStore';

const SESSION_KEY = 'lg_session';

beforeEach(() => {
  localStorage.clear();
  useGameStore.getState().reset();
  useUIStore.getState().reset();
  useUIStore.getState().clearChat();
});

describe('gameStore', () => {
  it('saves the session with the secret token, not just the public id', () => {
    const g = useGameStore.getState();
    g.setGameCode('ABCDE');
    g.setPlayerId('public-id');
    g.setSessionToken('secret');
    g.setPlayerName('Ann');
    g.saveSession();
    expect(JSON.parse(localStorage.getItem(SESSION_KEY))).toMatchObject({
      gameCode: 'ABCDE', sessionToken: 'secret', playerName: 'Ann',
    });
  });

  it('does not save a session without a token', () => {
    const g = useGameStore.getState();
    g.setGameCode('ABCDE');
    g.setPlayerId('id');
    g.setPlayerName('Ann');
    g.saveSession();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('keeps the session after a win with rematch, drops it otherwise', () => {
    localStorage.setItem(SESSION_KEY, '{"gameCode":"X"}');
    useGameStore.getState().setWinner({ winnerId: 'a', rematch: true });
    expect(localStorage.getItem(SESSION_KEY)).not.toBeNull();
    useGameStore.getState().setWinner({ winnerId: 'a', rematch: false });
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('acceptGameState maps server state incl. the bonus pot', () => {
    useGameStore.getState().acceptGameState({
      winningCard: 2, currentPlayerId: 'p1', players: [{ id: 'p1' }], roundNumber: 3,
      turnOrder: ['p1'], playHistory: [{ playerId: 'p1', cardsPlayed: 2 }], bonus: 4,
    });
    const s = useGameStore.getState();
    expect(s.bonus).toBe(4);
    expect(s.history).toHaveLength(1);
    expect(s.roundNumber).toBe(3);
  });

  it('resetGameState clears the game but keeps identity and lobby', () => {
    const g = useGameStore.getState();
    g.setGameCode('ABCDE');
    g.setPlayerId('me');
    g.setMyHand([1, 2]);
    g.setWinner({ winnerId: 'me', rematch: true });
    g.resetGameState();
    const s = useGameStore.getState();
    expect(s.gameCode).toBe('ABCDE');
    expect(s.playerId).toBe('me');
    expect(s.myHand).toEqual([]);
    expect(s.winner).toBeNull();
  });
});

describe('uiStore toasts', () => {
  it('shows and auto-dismisses toasts, keeping at most 4', () => {
    vi.useFakeTimers();
    for (let i = 0; i < 6; i++) toast(`t${i}`, 'info', 1000);
    expect(useUIStore.getState().toasts.map(t => t.message)).toEqual(['t2', 't3', 't4', 't5']);
    vi.advanceTimersByTime(1001);
    expect(useUIStore.getState().toasts).toHaveLength(0);
    vi.useRealTimers();
  });
});

describe('uiStore chat', () => {
  const msg = (id, playerId = 'other') => ({ id, playerId, playerName: 'X', text: id, ts: 0 });

  it('counts unread messages from others while closed', () => {
    const ui = useUIStore.getState();
    ui.addChatMessage('L1', msg('a'), 'me');
    ui.addChatMessage('L1', msg('b', 'me'), 'me');
    expect(useUIStore.getState().chatUnread).toBe(1);
    useUIStore.getState().setChatOpen(true);
    expect(useUIStore.getState().chatUnread).toBe(0);
    useUIStore.getState().addChatMessage('L1', msg('c'), 'me');
    expect(useUIStore.getState().chatUnread).toBe(0);
  });

  it('ignores duplicates and starts fresh for another lobby', () => {
    const ui = useUIStore.getState();
    ui.setChat('L1', [msg('a'), msg('b')]);
    ui.addChatMessage('L1', msg('b'), 'me');
    expect(useUIStore.getState().chatMessages).toHaveLength(2);
    useUIStore.getState().addChatMessage('L2', msg('z'), 'me');
    const s = useUIStore.getState();
    expect(s.chatLobby).toBe('L2');
    expect(s.chatMessages.map(m => m.id)).toEqual(['z']);
  });

  it('resetGameUI keeps chat (rematch) and preferences', () => {
    const ui = useUIStore.getState();
    ui.setVolume(0.3);
    ui.setChat('L1', [msg('a')]);
    ui.resetGameUI();
    expect(useUIStore.getState().chatMessages).toHaveLength(1);
    expect(useUIStore.getState().volume).toBe(0.3);
  });
});
