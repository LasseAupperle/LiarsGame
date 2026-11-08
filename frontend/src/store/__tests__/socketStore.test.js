/**
 * Auto-rejoin behaviour of socketStore (SPEC §2.1), with a fake socket.io client.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const fake = vi.hoisted(() => ({ socket: null }));

vi.mock('socket.io-client', () => ({
  default: () => {
    const handlers = {};
    fake.socket = {
      handlers,
      connected: false,
      emitted: [],
      rejoinResponse: null,
      on(ev, fn) { handlers[ev] = fn; },
      off() {},
      connect: vi.fn(),
      disconnect: vi.fn(),
      emit(ev, ...args) {
        this.emitted.push([ev, ...args]);
        const cb = args[args.length - 1];
        if (ev === 'game:rejoin' && typeof cb === 'function') cb(this.rejoinResponse);
      },
      fire(ev, ...args) { handlers[ev]?.(...args); },
    };
    return fake.socket;
  },
}));

const { default: useSocketStore } = await import('../socketStore');
const { default: useGameStore } = await import('../gameStore');
const { default: useUIStore } = await import('../uiStore');

const SESSION = { gameCode: 'ABCDE', playerId: 'me', sessionToken: 'tok', playerName: 'Ann' };

function connectWith(response) {
  useSocketStore.setState({ socket: null, connected: false });
  const socket = useSocketStore.getState().connect('http://test');
  socket.rejoinResponse = response;
  socket.connected = true;
  socket.fire('connect');
  return socket;
}

beforeEach(() => {
  localStorage.clear();
  useGameStore.getState().reset();
  useUIStore.getState().clearChat();
});

describe('auto-rejoin on connect', () => {
  it('does nothing without a session', () => {
    const socket = connectWith(null);
    expect(socket.emitted.filter(e => e[0] === 'game:rejoin')).toHaveLength(0);
  });

  it('restores a running game from the stored session (page reload)', () => {
    localStorage.setItem('lg_session', JSON.stringify(SESSION));
    const socket = connectWith({
      success: true, phase: 'game', playerId: 'me', hand: [1, 2, 3],
      gameState: { roundNumber: 2, players: [], playHistory: [], turnOrder: [], bonus: 1 },
      settings: { mode: 'short' }, endTime: null, chat: [{ id: 'm1', playerId: 'x', text: 'hi' }],
    });
    expect(socket.emitted.find(e => e[0] === 'game:rejoin').slice(1, 3)).toEqual(['ABCDE', 'tok']);
    const g = useGameStore.getState();
    expect(g.status).toBe('playing');
    expect(g.myHand).toEqual([1, 2, 3]);
    expect(g.playerId).toBe('me');
    expect(g.gameSettings.mode).toBe('short');
    expect(useUIStore.getState().chatMessages).toHaveLength(1);
  });

  it('restores a waiting lobby', () => {
    localStorage.setItem('lg_session', JSON.stringify(SESSION));
    connectWith({ success: true, phase: 'lobby', playerId: 'me', players: [{ id: 'me' }], host: 'me', chat: [] });
    const g = useGameStore.getState();
    expect(g.status).toBe('lobby');
    expect(g.gameCode).toBe('ABCDE');
    expect(g.hostId).toBe('me');
  });

  it('shows the result when the game ended while away', () => {
    localStorage.setItem('lg_session', JSON.stringify(SESSION));
    connectWith({ success: false, ended: true, winner: { winnerId: 'x', winnerName: 'Xi', finalScore: 20 } });
    expect(useGameStore.getState().status).toBe('won');
    expect(useGameStore.getState().winner.winnerName).toBe('Xi');
  });

  it('goes back to the menu when the in-memory game is gone', () => {
    const g = useGameStore.getState();
    g.setGameCode('ABCDE');
    g.setSessionToken('tok');
    g.setPlayerName('Ann');
    g.setStatus('playing');
    connectWith({ success: false, message: 'Game no longer active' });
    expect(useGameStore.getState().gameCode).toBeNull();
    expect(useGameStore.getState().status).toBe('lobby');
  });

  it('fails acknowledgements fast while disconnected', () => {
    useSocketStore.setState({ connected: false });
    const cb = vi.fn();
    useSocketStore.getState().emit('game:play', 'ABCDE', [0], cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });
});
