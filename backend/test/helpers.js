const GameEngine = require('../src/game/GameEngine');
const Player = require('../src/game/Player');

/**
 * Build an engine with a fixed, deterministic round:
 * players p0..pN-1 in that turn order, table card = Ace (1).
 * @param {number[][]} hands - one hand per player
 */
function makeEngine(hands, settings = {}) {
  const players = hands.map((_, i) => new Player(`p${i}`, `P${i}`));
  const engine = new GameEngine(players, settings);
  engine.startRound();
  engine.winningCard = 1;
  engine.turnOrder = players.map(p => p.id);
  engine.currentPlayerIndex = 0;
  players.forEach((p, i) => { p.hand = [...hands[i]]; });
  return { engine, players };
}

module.exports = { makeEngine };
