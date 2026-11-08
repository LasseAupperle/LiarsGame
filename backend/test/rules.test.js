const { test } = require('node:test');
const assert = require('node:assert/strict');
const { isTruthful, calculateScoreChange, getActivePlayers, getWinner } = require('../src/game/rules');
const Deck = require('../src/game/Deck');
const Player = require('../src/game/Player');

const withScores = (...scores) => scores.map((s, i) => Object.assign(new Player(`p${i}`, `P${i}`), { mainScore: s }));

test('deck has 6 Aces, 6 Kings, 6 Queens, 2 Jokers', () => {
  const deck = new Deck();
  const count = c => deck.cards.filter(x => x === c).length;
  assert.deepEqual([count(1), count(2), count(3), count(4)], [6, 6, 6, 2]);
});

test('truthful = every card is the table card or a Joker', () => {
  assert.equal(isTruthful([1, 1], 1), true);
  assert.equal(isTruthful([1, 4], 1), true);
  assert.equal(isTruthful([4], 2), true);
  assert.equal(isTruthful([1, 2], 1), false);
});

test('score change: correct call pays caller 1 + bonus', () => {
  assert.deepEqual(calculateScoreChange(true, 3), { liarScore: -1, callerScore: 4, othersScore: 1 });
  assert.deepEqual(calculateScoreChange(false, 3), { liarScore: 1, callerScore: -1, othersScore: 1 });
});

test('below target everyone non-spectator stays active', () => {
  assert.equal(getActivePlayers(withScores(5, 19, 0), 20).length, 3);
});

test('tiebreak: only top scorers stay active once target reached', () => {
  const active = getActivePlayers(withScores(21, 21, 15), 20);
  assert.deepEqual(active.map(p => p.id), ['p0', 'p1']);
  assert.equal(getWinner(withScores(21, 21, 15), 20), null);
});

test('winner: sole top scorer at or above target', () => {
  assert.equal(getWinner(withScores(20, 18), 20).id, 'p0');
  assert.equal(getWinner(withScores(19, 18), 20), null);
});

test('Player.removeCards is atomic on bad input', () => {
  const p = new Player('a', 'A');
  p.hand = [1, 2, 3];
  assert.throws(() => p.removeCards([2, 2]));
  assert.throws(() => p.removeCards([0, 5]));
  assert.deepEqual(p.hand, [1, 2, 3]);
  const input = [0, 2];
  assert.deepEqual(p.removeCards(input).sort(), [1, 3]);
  assert.deepEqual(input, [0, 2], 'caller array not mutated');
  assert.deepEqual(p.hand, [2]);
});

test('scores never go below 0', () => {
  const p = new Player('a', 'A');
  p.updateScore(-1);
  assert.equal(p.mainScore, 0);
});
