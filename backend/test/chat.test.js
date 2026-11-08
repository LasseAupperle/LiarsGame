/**
 * Chat (SPEC §2.4)
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
  const c = ioClient(url, { reconnection: false, transports: ['websocket'], forceNew: true });
  clients.push(c);
  c.on('connect', () => resolve(c));
  c.on('connect_error', reject);
});
const call = (c, ...args) => new Promise(r => c.emit(...args, r));
const nextEvent = (c, ev) => new Promise(r => c.once(ev, r));

test('messages reach everyone in the lobby, cleaned up', async () => {
  const [a, b] = await Promise.all([connect(), connect()]);
  const created = await call(a, 'lobby:create', 'Ann', {});
  await call(b, 'lobby:join', created.lobbyCode, 'Ben');
  const received = nextEvent(b, 'chat:message');
  assert.equal((await call(a, 'chat:send', '  hi\nthere  ')).success, true);
  const msg = await received;
  assert.equal(msg.text, 'hi there');
  assert.equal(msg.playerName, 'Ann');
  assert.equal(msg.playerId, created.playerId);
  assert.equal(msg.isBot, false);
});

test('invalid messages and outsiders are rejected', async () => {
  const [a, outsider] = await Promise.all([connect(), connect()]);
  await call(a, 'lobby:create', 'Cat', {});
  assert.equal((await call(a, 'chat:send', '   ')).success, false);
  assert.equal((await call(a, 'chat:send', 'x'.repeat(201))).success, false);
  assert.equal((await call(a, 'chat:send', { html: '<b>' })).success, false);
  assert.equal((await call(outsider, 'chat:send', 'hello?')).success, false);
});

test('rate limit: 5 messages per 10 s', async () => {
  const a = await connect();
  await call(a, 'lobby:create', 'Dan', {});
  for (let i = 0; i < 5; i++) assert.equal((await call(a, 'chat:send', `m${i}`)).success, true);
  const sixth = await call(a, 'chat:send', 'one more');
  assert.equal(sixth.success, false);
  assert.match(sixth.message, /slow/i);
});

test('history is returned on join and rejoin', async () => {
  const [a, b, a2] = await Promise.all([connect(), connect(), connect()]);
  const created = await call(a, 'lobby:create', 'Eve', {});
  await call(a, 'chat:send', 'first');
  await call(a, 'chat:send', 'second');
  const joined = await call(b, 'lobby:join', created.lobbyCode, 'Fay');
  assert.deepEqual(joined.chat.map(m => m.text), ['first', 'second']);
  const rejoined = await call(a2, 'game:rejoin', created.lobbyCode, created.token);
  assert.deepEqual(rejoined.chat.map(m => m.text), ['first', 'second']);
});

test('chat works during a game', async () => {
  const [a, b] = await Promise.all([connect(), connect()]);
  const created = await call(a, 'lobby:create', 'Gus', {});
  await call(b, 'lobby:join', created.lobbyCode, 'Hal');
  await call(a, 'lobby:start');
  const received = nextEvent(a, 'chat:message');
  assert.equal((await call(b, 'chat:send', 'liar!')).success, true);
  assert.equal((await received).playerName, 'Hal');
});
