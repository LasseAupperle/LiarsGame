/**
 * Integration tests: real Socket.IO clients against the server (SPEC §3, §4).
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const ioClient = require('socket.io-client');
const { createApp } = require('../src/app');

let server, io, url;
const clients = [];

before(async () => {
  ({ server, io } = createApp());
  await new Promise(r => server.listen(0, r));
  url = `http://localhost:${server.address().port}`;
});

after(async () => {
  clients.forEach(c => c.disconnect());
  await new Promise(r => io.close(r));
});

const connect = () => new Promise((resolve, reject) => {
  const c = ioClient(url, { reconnection: false, transports: ['websocket'] });
  clients.push(c);
  c.on('connect', () => resolve(c));
  c.on('connect_error', reject);
});
const call = (c, ...args) => new Promise(r => c.emit(...args, r));
const nextEvent = (c, ev) => new Promise(r => c.once(ev, r));

/** Create a lobby with n players and start the game. */
async function startGame(n = 3) {
  const socks = await Promise.all(Array.from({ length: n }, connect));
  const created = await call(socks[0], 'lobby:create', 'P0', {});
  assert.equal(created.success, true);
  const code = created.lobbyCode;
  const ids = [created.playerId];
  for (let i = 1; i < n; i++) {
    const r = await call(socks[i], 'lobby:join', code, `P${i}`);
    assert.equal(r.success, true, r.message);
    ids.push(r.playerId);
  }
  const hands = socks.map(s => nextEvent(s, 'game:hand'));
  const started = await call(socks[0], 'lobby:start');
  assert.equal(started.success, true);
  const byId = Object.fromEntries(ids.map((id, i) => [id, socks[i]]));
  return { code, socks, ids, byId, state: started.gameState, hands: await Promise.all(hands) };
}

test('lobby input validation', async () => {
  const c = await connect();
  assert.equal((await call(c, 'lobby:create', '   ', {})).success, false);
  assert.equal((await call(c, 'lobby:create', 'x'.repeat(21), {})).success, false);
  assert.equal((await call(c, 'lobby:create', 'A', { mode: 'nope' })).success, false);
  assert.equal((await call(c, 'lobby:create', 'A', { mode: 'timed', timedMinutes: 0 })).success, false);
  assert.equal((await call(c, 'lobby:join', 12345, 'A')).success, false);
  assert.equal((await call(c, 'game:rejoin', null, null)).success, false);
  assert.deepEqual(await call(c, 'game:checkRejoin', null), { canRejoin: false });
});

test('names are trimmed and unique per lobby (case-insensitive)', async () => {
  const [a, b] = await Promise.all([connect(), connect()]);
  const created = await call(a, 'lobby:create', '  Bob  ', {});
  assert.equal(created.players[0].name, 'Bob');
  const dup = await call(b, 'lobby:join', created.lobbyCode.toLowerCase(), 'bob');
  assert.equal(dup.success, false);
  assert.match(dup.message, /taken/);
});

test('only the host can start; 2+ players required', async () => {
  const [a, b] = await Promise.all([connect(), connect()]);
  const created = await call(a, 'lobby:create', 'Host', {});
  assert.equal((await call(a, 'lobby:start')).success, false, 'needs 2 players');
  await call(b, 'lobby:join', created.lobbyCode, 'Guest');
  assert.equal((await call(b, 'lobby:start')).message, 'Only host can start game');
});

test('hands are private and gameState has no hands', async () => {
  const { hands, state } = await startGame(3);
  hands.forEach(h => assert.equal(h.length, 5));
  assert.ok(state.players.every(p => !('hand' in p)));
  assert.equal(state.bonus, 0);
});

test('turn rules are enforced server-side', async () => {
  const { code, byId, state, socks } = await startGame(3);
  const order = state.turnOrder;
  const first = byId[order[0]], second = byId[order[1]], third = byId[order[2]];

  assert.equal((await call(second, 'game:play', code, [0])).message, 'Not your turn');
  assert.equal((await call(first, 'game:play', code, [0, 0])).success, false);
  assert.equal((await call(first, 'game:play', 'ZZZZZ', [0])).message, 'Not in this game');

  // game:nextTurn no longer exists: no ack ever comes back
  const ack = await Promise.race([call(second, 'game:nextTurn', code), new Promise(r => setTimeout(() => r('none'), 200))]);
  assert.equal(ack, 'none');

  assert.equal((await call(first, 'game:play', code, [0])).success, true);
  assert.equal((await call(third, 'game:callLiar', code)).message, 'Not your turn');

  const revealed = Promise.all(socks.map(s => nextEvent(s, 'game:liar:revealed')));
  const res = await call(second, 'game:callLiar', code);
  assert.equal(res.success, true);
  const [payload] = await revealed;
  assert.equal(payload.cardsPlayed.length, 1);
  assert.equal(typeof payload.bonusPaid, 'number');
  assert.equal(res.gameState.roundNumber, 2, 'new round after a liar call');
});

test('a socket cannot act in a game it is not part of', async () => {
  const { code } = await startGame(2);
  const outsider = await connect();
  assert.equal((await call(outsider, 'game:play', code, [0])).success, false);
  assert.equal((await call(outsider, 'game:callLiar', code)).success, false);
});
