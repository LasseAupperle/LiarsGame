const { test } = require('node:test');
const assert = require('node:assert/strict');
const { makeEngine } = require('./helpers');
const GameEngine = require('../src/game/GameEngine');
const Player = require('../src/game/Player');

test('startRound deals 5 cards to each active player and randomises order', () => {
  const players = [0, 1, 2, 3].map(i => new Player(`p${i}`, `P${i}`));
  const engine = new GameEngine(players);
  engine.startRound();
  players.forEach(p => assert.equal(p.hand.length, 5));
  assert.equal(engine.turnOrder.length, 4);
  assert.ok([1, 2, 3].includes(engine.winningCard));
  assert.equal(engine.bonus, 0);
});

test('play: only current player, 1-3 distinct valid indices', () => {
  const { engine, players } = makeEngine([[1, 2, 3, 1, 2], [1, 1, 1, 1, 1]]);
  assert.equal(engine.playTurn('p1', [0]).message, 'Not your turn');
  for (const bad of [[], [0, 1, 2, 3], [0, 0], [5], [-1], [1.5], ['0'], 'x']) {
    assert.equal(engine.playTurn('p0', bad).success, false, JSON.stringify(bad));
  }
  assert.equal(players[0].hand.length, 5, 'rejected plays never change the hand');
  assert.equal(engine.playTurn('p0', [0, 3]).success, true);
  assert.equal(players[0].hand.length, 3);
  assert.equal(engine.roundPlays.p0.truthful, true);
});

test('spectators cannot play or call liar', () => {
  const { engine, players } = makeEngine([[1, 1], [1, 1]]);
  players[0].spectator = true;
  assert.equal(engine.playTurn('p0', [0]).success, false);
  players[0].spectator = false;
  engine.playTurn('p0', [0]);
  engine.nextTurn();
  players[1].spectator = true;
  assert.equal(engine.callLiar('p1').success, false);
});

test('liar: only the current player may call, never on themselves', () => {
  const { engine } = makeEngine([[2, 2], [1, 1], [1, 1]]);
  assert.equal(engine.callLiar('p1').success, false, 'no play yet');
  engine.playTurn('p0', [0]);
  engine.nextTurn();
  assert.equal(engine.callLiar('p2').message, 'Not your turn');
  assert.equal(engine.callLiar('p0').message, 'Cannot call liar on yourself');
  assert.equal(engine.callLiar('p1').success, true);
});

test('correct call: accused -1, caller +1+pot, others +1, pot -1', () => {
  const { engine, players } = makeEngine([[2, 2], [1, 1], [1, 1]]);
  players.forEach(p => { p.mainScore = 5; });
  engine.bonus = 3;
  engine.playTurn('p0', [0]); // bluff: King on Ace table
  engine.nextTurn();
  const { result } = engine.callLiar('p1');
  assert.equal(result.isLiarCorrect, true);
  assert.equal(result.bonusPaid, 3);
  assert.deepEqual(players.map(p => p.mainScore), [4, 9, 6]);
  assert.deepEqual(result.scoreDeltas, { p0: -1, p1: 4, p2: 1 });
  assert.equal(engine.bonus, 2);
});

test('wrong call: accused +1, caller -1, others +1, pot -1, nothing paid', () => {
  const { engine, players } = makeEngine([[1, 4], [1, 1], [1, 1]]);
  players.forEach(p => { p.mainScore = 5; });
  engine.bonus = 2;
  engine.playTurn('p0', [0, 1]); // Ace + Joker: truthful
  engine.nextTurn();
  const { result } = engine.callLiar('p1');
  assert.equal(result.isLiarCorrect, false);
  assert.equal(result.bonusPaid, 0);
  assert.deepEqual(players.map(p => p.mainScore), [6, 4, 6]);
  assert.equal(engine.bonus, 1);
});

test('pot never goes below 0 and deltas reflect clamping', () => {
  const { engine } = makeEngine([[1], [1]]);
  engine.playTurn('p0', [0]);
  engine.nextTurn();
  const { result } = engine.callLiar('p1'); // wrong call, caller at 0
  assert.equal(engine.bonus, 0);
  assert.equal(result.scoreDeltas.p1, undefined, 'caller stayed at 0, no change reported');
  assert.equal(result.scoreDeltas.p0, 1);
});

test('no-liar round: everyone +1, pot +1', () => {
  const { engine, players } = makeEngine([[1], [1]]);
  engine.bonus = 1;
  const deltas = engine.resolveNoLiarCall();
  assert.deepEqual(deltas, { p0: 1, p1: 1 });
  assert.deepEqual(players.map(p => p.mainScore), [1, 1]);
  assert.equal(engine.bonus, 2);
});

test('nextTurn skips players with empty hands', () => {
  const { engine } = makeEngine([[1], [], [1]]);
  engine.playTurn('p0', [0]);
  engine.nextTurn();
  assert.equal(engine.getGameState().currentPlayerId, 'p2');
});

test('victory at target with sole leader; tiebreak spectates others', () => {
  const { engine, players } = makeEngine([[1], [1], [1]]);
  players[0].mainScore = 21; players[1].mainScore = 21; players[2].mainScore = 10;
  assert.equal(engine.isVictoryConditionMet(), null);
  assert.deepEqual(players.map(p => p.spectator), [false, false, true]);
  players[0].mainScore = 22;
  assert.equal(engine.isVictoryConditionMet().id, 'p0');
});

test('short mode targets 10 points', () => {
  const { engine, players } = makeEngine([[1], [1]], { mode: 'short' });
  players[0].mainScore = 10;
  assert.equal(engine.isVictoryConditionMet().id, 'p0');
});

test('timed mode: no score win before time is up; tie at time-up goes to tiebreak', () => {
  const { engine, players } = makeEngine([[1], [1], [1]], { mode: 'timed', timedMinutes: 5 });
  players[0].mainScore = 30;
  assert.equal(engine.isVictoryConditionMet(), null);
  players[1].mainScore = 30;
  assert.equal(engine.resolveTimedGame().winner, null);
  assert.deepEqual(players.map(p => p.spectator), [false, false, true]);
  players[1].mainScore = 31;
  assert.equal(engine.isVictoryConditionMet().id, 'p1');
});

test('gameState never contains hands and exposes the pot', () => {
  const { engine } = makeEngine([[1, 2], [3]]);
  const state = engine.getGameState();
  assert.equal(state.bonus, 0);
  assert.ok(state.players.every(p => !('hand' in p)));
  assert.deepEqual(state.players.map(p => p.cardsLeft), [2, 1]);
});
