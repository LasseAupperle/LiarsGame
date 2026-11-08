/**
 * Bots (SPEC §2.2): decision logic + full games against bots.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const ioClient = require('socket.io-client');
const config = require('../src/config');
Object.assign(config, { BOT_MIN_MS: 5, BOT_MAX_MS: 15, AUTO_PLAY_MS: 50, GAME_GRACE_MS: 300, LOBBY_GRACE_MS: 300 });
const { createApp } = require('../src/app');
const { decide, probabilityTruthful } = require('../src/game/BotBrain');
const { makeEngine } = require('./helpers');

// ---------- decision logic ----------

test('a claim needing more matching cards than exist unseen is a certain lie', () => {
  // Bot holds all 6 Aces + 1 Joker: only 1 matching card is unseen
  const p = probabilityTruthful({ hand: [1, 1, 1, 1, 1], myPlayed: [1, 4], tableCard: 1, claimCount: 2, earlierClaims: 0 });
  assert.equal(p, 0);
  const d = decide({ hand: [1, 1, 1], myPlayed: [1, 1, 1, 4], tableCard: 1, botId: 'b', playHistory: [{ playerId: 'x', cardsPlayed: 2 }] });
  assert.equal(d.action, 'liar');
});

test('bigger claims are less likely to be true', () => {
  const base = { hand: [2, 3, 2, 3, 2], myPlayed: [], tableCard: 1, earlierClaims: 0 };
  const p1 = probabilityTruthful({ ...base, claimCount: 1 });
  const p3 = probabilityTruthful({ ...base, claimCount: 3 });
  assert.ok(p1 > p3 && p3 > 0, `${p1} > ${p3} > 0`);
});

test('bot moves are always legal (fuzz)', () => {
  let seed = 42;
  const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 2000; i++) {
    const size = 1 + Math.floor(rng() * 5);
    const hand = Array.from({ length: size }, () => 1 + Math.floor(rng() * 4));
    const history = rng() < 0.5 ? [] : [{ playerId: rng() < 0.8 ? 'other' : 'b', cardsPlayed: 1 + Math.floor(rng() * 3) }];
    const d = decide({ hand, tableCard: 1 + Math.floor(rng() * 3), botId: 'b', playHistory: history, bonus: Math.floor(rng() * 4) }, rng);
    if (d.action === 'play') {
      assert.ok(d.indices.length >= 1 && d.indices.length <= 3, JSON.stringify({ hand, d }));
      assert.equal(new Set(d.indices).size, d.indices.length);
      assert.ok(d.indices.every(i => i >= 0 && i < hand.length));
    } else {
      assert.ok(history.length && history[0].playerId !== 'b', 'never calls liar on nothing or itself');
    }
  }
});

test('with matching cards and nothing to challenge, a bot plays truthfully most of the time', () => {
  let truthful = 0;
  for (let i = 0; i < 500; i++) {
    const hand = [1, 4, 2, 3, 2];
    const d = decide({ hand, tableCard: 1, botId: 'b', playHistory: [] });
    if (d.indices.every(idx => hand[idx] === 1 || hand[idx] === 4)) truthful++;
  }
  assert.ok(truthful > 350, `truthful ${truthful}/500`);
});

test('engine records every card a player played this round', () => {
  const { engine } = makeEngine([[1, 2, 3, 1], [1]]);
  engine.playTurn('p0', [0]);
  engine.currentPlayerIndex = 0;
  engine.playTurn('p0', [0, 1]);
  assert.equal(engine.playedThisRound.p0.length, 3);
});

// ---------- full games ----------

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

test('host adds bots up to 4 players; others cannot; humans take bot seats', async () => {
  const [host, guest, late] = await Promise.all([connect(), connect(), connect()]);
  const created = await call(host, 'lobby:create', 'Host', {});
  const code = created.lobbyCode;
  for (let i = 0; i < 3; i++) assert.equal((await call(host, 'lobby:addBot')).success, true);
  assert.equal((await call(host, 'lobby:addBot')).message, 'Lobby is full');

  const joined = await call(guest, 'lobby:join', code, 'Guest');
  assert.equal(joined.success, true, 'human replaces a bot in a full lobby');
  assert.equal(joined.players.filter(p => p.isBot).length, 2);
  assert.equal((await call(guest, 'lobby:addBot')).message, 'Only the host can do that');

  const bot = joined.players.find(p => p.isBot);
  assert.equal((await call(host, 'lobby:removeBot', bot.id)).success, true);
  assert.equal((await call(late, 'lobby:join', code, 'Late')).success, true);
});

test('solo game against 3 bots plays to a winner', { timeout: 30000 }, async () => {
  const me = await connect();
  const created = await call(me, 'lobby:create', 'Solo', { mode: 'short' });
  for (let i = 0; i < 3; i++) await call(me, 'lobby:addBot');

  let state = null;
  let hand = [];
  me.on('game:state', s => { state = s; });
  me.on('game:hand', h => { hand = h; });
  const won = new Promise(r => me.once('game:won', r));
  const started = await call(me, 'lobby:start');
  assert.equal(started.success, true);
  state = started.gameState;
  assert.equal(state.players.filter(p => p.isBot).length, 3);

  // Simple human: play one card whenever it's our turn
  let acting = false;
  const loop = setInterval(async () => {
    if (acting || !state || state.currentPlayerId !== created.playerId || hand.length === 0) return;
    acting = true;
    await call(me, 'game:play', created.lobbyCode, [0]);
    acting = false;
  }, 10);

  let timer;
  const result = await Promise.race([won, new Promise(r => { timer = setTimeout(() => r(null), 25000); })]);
  clearTimeout(timer);
  clearInterval(loop);
  assert.ok(result, 'game finished');
  assert.ok(result.finalScore >= 10);
});

/** Drive a single human (always plays card 0) until game:won. */
async function playUntilWon(sock, { playerId, lobbyCode, token }) {
  let state = null;
  let hand = [];
  const onState = s => { state = s; };
  const onHand = h => { hand = h; };
  sock.on('game:state', onState);
  sock.on('game:hand', onHand);
  // Fetch the current state + hand (the deal may have happened before we listened)
  const now = await call(sock, 'game:rejoin', lobbyCode, token);
  state = now.gameState;
  hand = now.hand;
  const won = new Promise(r => sock.once('game:won', r));
  let acting = false;
  const loop = setInterval(async () => {
    if (acting || !state || state.currentPlayerId !== playerId || hand.length === 0) return;
    acting = true;
    await call(sock, 'game:play', lobbyCode, [0]);
    acting = false;
  }, 10);
  let timer;
  const result = await Promise.race([won, new Promise(r => { timer = setTimeout(() => r(null), 25000); })]);
  clearTimeout(timer);
  clearInterval(loop);
  sock.off('game:state', onState);
  sock.off('game:hand', onHand);
  return result;
}

test('after a win the lobby returns to waiting for a rematch (SPEC §2.3)', { timeout: 60000 }, async () => {
  const me = await connect();
  const created = await call(me, 'lobby:create', 'Again', { mode: 'short' });
  await call(me, 'lobby:addBot');
  const updates = [];
  me.on('lobby:updated', u => updates.push(u));

  await call(me, 'lobby:start');
  const result = await playUntilWon(me, created);
  assert.ok(result, 'first game finished');
  assert.equal(result.rematch, true);
  assert.equal(result.finalScores.length, 2);
  assert.ok(result.finalScores[0].mainScore >= result.finalScores[1].mainScore);

  await sleep(50);
  const view = updates.at(-1);
  assert.equal(view.host, created.playerId);
  assert.equal(view.players.length, 2, 'bot kept');
  assert.equal(view.lastResult.winnerId, result.winnerId);

  const rejoin = await call(me, 'game:rejoin', created.lobbyCode, created.token);
  assert.equal(rejoin.phase, 'lobby');
  assert.equal(rejoin.lastResult.winnerId, result.winnerId);

  const second = await call(me, 'lobby:start');
  assert.equal(second.success, true, 'host can start the rematch');
  assert.ok(second.gameState.players.every(p => p.mainScore === 0), 'scores reset');
  assert.equal(second.gameState.roundNumber, 1);
});

test('when the last human leaves, a game with bots ends', async () => {
  const me = await connect();
  const code = (await call(me, 'lobby:create', 'Alone', {})).lobbyCode;
  await call(me, 'lobby:addBot');
  assert.equal((await call(me, 'lobby:start')).success, true);
  await call(me, 'lobby:leave');
  await sleep(50);
  const still = (await call(me, 'lobby:list')).lobbies.find(l => l.code === code);
  assert.equal(still, undefined, 'lobby closed');
});
