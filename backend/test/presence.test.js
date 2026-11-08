/**
 * Integration tests for presence, disconnects, auto-play and rejoin (SPEC §2.1).
 * Timers are shortened via config.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const ioClient = require('socket.io-client');
const config = require('../src/config');
Object.assign(config, { GAME_GRACE_MS: 600, LOBBY_GRACE_MS: 400, AUTO_PLAY_MS: 150 });
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

const sleep = ms => new Promise(r => setTimeout(r, ms));
const connect = () => new Promise((resolve, reject) => {
  const c = ioClient(url, { reconnection: false, transports: ['websocket'], forceNew: true });
  clients.push(c);
  c.on('connect', () => resolve(c));
  c.on('connect_error', reject);
});
const call = (c, ...args) => new Promise(r => c.emit(...args, r));
const nextEvent = (c, ev, ms = 2000) => Promise.race([
  new Promise(r => c.once(ev, r)),
  sleep(ms).then(() => { throw new Error(`timeout waiting for ${ev}`); }),
]);
/** Collect every occurrence of an event on a socket. */
const record = (c, ev) => { const list = []; c.on(ev, d => list.push(d)); return list; };

async function lobbyWith(n) {
  const socks = await Promise.all(Array.from({ length: n }, connect));
  const created = await call(socks[0], 'lobby:create', 'P0', {});
  const code = created.lobbyCode;
  const ids = [created.playerId];
  const tokens = [created.token];
  for (let i = 1; i < n; i++) {
    const joined = await call(socks[i], 'lobby:join', code, `P${i}`);
    ids.push(joined.playerId);
    tokens.push(joined.token);
  }
  return { code, socks, ids, tokens };
}

async function gameWith(n) {
  const lobby = await lobbyWith(n);
  const started = await call(lobby.socks[0], 'lobby:start');
  assert.equal(started.success, true);
  return { ...lobby, state: started.gameState };
}

test('a stale socket disconnecting does not mark the player disconnected', async () => {
  const { code, socks, ids, tokens } = await gameWith(2);
  const disconnects = record(socks[1], 'player:disconnected');
  // P0 reconnects on a new socket before the old one goes away (typical on mobile)
  const fresh = await connect();
  const res = await call(fresh, 'game:rejoin', code, tokens[0]);
  assert.equal(res.success, true);
  assert.equal(res.phase, 'game');
  socks[0].disconnect();
  await sleep(config.GAME_GRACE_MS + 200);
  assert.equal(disconnects.length, 0);
  const { gameState } = await call(fresh, 'game:rejoin', code, tokens[0]);
  assert.ok(gameState.players.every(p => p.connected && !p.spectator));
});

test('waiting lobby: disconnected player is kept during grace and can rejoin', async () => {
  const { code, socks, ids, tokens } = await lobbyWith(2);
  const updates = record(socks[0], 'lobby:updated');
  socks[1].disconnect();
  await sleep(100);
  const last = updates.at(-1);
  assert.equal(last.players.length, 2);
  assert.equal(last.players.find(p => p.id === ids[1]).connected, false);

  const back = await connect();
  const res = await call(back, 'game:rejoin', code, tokens[1]);
  assert.equal(res.phase, 'lobby');
  assert.equal(res.players.find(p => p.id === ids[1]).connected, true);
  await sleep(config.LOBBY_GRACE_MS + 150);
  assert.equal(updates.at(-1).players.length, 2, 'not removed after rejoining');

  // and the host can still start with them in it
  const started = await call(socks[0], 'lobby:start');
  assert.equal(started.success, true);
});

test('waiting lobby: player is removed when the grace period expires', async () => {
  const { socks, ids } = await lobbyWith(3);
  const updates = record(socks[0], 'lobby:updated');
  socks[2].disconnect();
  await sleep(config.LOBBY_GRACE_MS + 150);
  assert.deepEqual(updates.at(-1).players.map(p => p.id), [ids[0], ids[1]]);
});

test('disconnected current player gets a card auto-played', async () => {
  const { socks, ids, state } = await gameWith(3);
  const currentIdx = ids.indexOf(state.currentPlayerId);
  const watcher = socks[(currentIdx + 1) % 3];
  const auto = nextEvent(watcher, 'game:autoPlayed');
  socks[currentIdx].disconnect();
  const payload = await auto;
  assert.equal(payload.playerId, state.currentPlayerId);
  const after = await nextEvent(watcher, 'game:state');
  assert.notEqual(after.currentPlayerId, state.currentPlayerId);
  assert.equal(after.playHistory.at(-1).playerId, state.currentPlayerId);
});

test('grace expiry with 2 players ends the game; late rejoin sees the result', async () => {
  const { code, socks, ids, tokens } = await gameWith(2);
  const won = nextEvent(socks[0], 'game:won', config.GAME_GRACE_MS + 1500);
  socks[1].disconnect();
  const result = await won;
  assert.equal(result.winnerId, ids[0]);

  const late = await connect();
  const res = await call(late, 'game:rejoin', code, tokens[1]);
  assert.equal(res.success, false);
  assert.equal(res.ended, true);
  assert.equal(res.winner.winnerId, ids[0]);
});

test('leaving a running game removes the player at once and ends their session', async () => {
  const { code, socks, ids, tokens, state } = await gameWith(3);
  const currentIdx = ids.indexOf(state.currentPlayerId);
  const leaver = socks[currentIdx];
  const watcher = socks[(currentIdx + 1) % 3];
  const left = nextEvent(watcher, 'player:left');
  const nextState = nextEvent(watcher, 'game:state');
  await call(leaver, 'lobby:leave');
  assert.equal((await left).playerId, ids[currentIdx]);
  const s = await nextState;
  assert.equal(s.turnOrder.length, 2);
  assert.notEqual(s.currentPlayerId, ids[currentIdx], 'turn moved on');
  assert.equal(s.players.find(p => p.id === ids[currentIdx]).spectator, true);

  const back = await connect();
  assert.equal((await call(back, 'game:rejoin', code, tokens[currentIdx])).success, false);
});

test('a player removed after the grace period can rejoin and sits out the round', async () => {
  const { code, socks, ids, tokens } = await gameWith(3);
  const left = nextEvent(socks[0], 'player:left', config.GAME_GRACE_MS + 1500);
  socks[2].disconnect();
  assert.equal((await left).playerId, ids[2]);

  const back = await connect();
  const res = await call(back, 'game:rejoin', code, tokens[2]);
  assert.equal(res.success, true);
  assert.equal(res.playerId, ids[2]);
  assert.deepEqual(res.hand, [], 'sits out until next round');
  assert.equal(res.gameState.players.find(p => p.id === ids[2]).spectator, false);
});

test('knowing a public playerId is not enough to rejoin as that player', async () => {
  const { code, ids } = await gameWith(2);
  const attacker = await connect();
  const res = await call(attacker, 'game:rejoin', code, ids[1]);
  assert.equal(res.success, false);
  assert.deepEqual(await call(attacker, 'game:checkRejoin', { lobbyCode: code, token: ids[1] }), { canRejoin: false });
});
