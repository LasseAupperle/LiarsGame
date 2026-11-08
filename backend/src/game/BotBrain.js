/**
 * BotBrain.js - Decision making for bot players (SPEC §2.2).
 *
 * Pure function of what a human in the bot's seat could know: its own hand and
 * the cards it played this round, the public play history and the bonus pot.
 * It never looks at other players' hands.
 */

const MATCHING_IN_DECK = 8; // 6 of the table card + 2 Jokers
const DECK_SIZE = 20;

const isMatching = (card, tableCard) => card === tableCard || card === 4;

/**
 * Probability that the last claim ("k × table card") is true, from the bot's view.
 * Hypergeometric draw of k cards from the cards the bot hasn't seen, after
 * discounting earlier unchallenged claims this round.
 */
function probabilityTruthful({ hand, myPlayed, tableCard, claimCount, earlierClaims }) {
  const seen = [...hand, ...myPlayed];
  const unknownTotal = DECK_SIZE - seen.length;
  const unknownMatching = MATCHING_IN_DECK - seen.filter(c => isMatching(c, tableCard)).length;
  if (claimCount > unknownMatching) return 0; // impossible: someone is lying

  // Earlier claims by others probably used up some matching cards (they may have bluffed too)
  const expectedUsed = Math.min(unknownMatching, earlierClaims * 0.6);
  const matching = unknownMatching - expectedUsed;
  const total = Math.max(claimCount, unknownTotal - earlierClaims);

  let p = 1;
  for (let i = 0; i < claimCount; i++) {
    p *= Math.max(0, matching - i) / (total - i);
  }
  return Math.min(1, Math.max(0, p));
}

/** Choose which cards to play. Returns hand indices. */
function choosePlay(hand, tableCard, rng) {
  const matching = [];
  const other = [];
  hand.forEach((card, i) => (isMatching(card, tableCard) ? matching : other).push(i));

  if (matching.length === 0) {
    // Forced bluff: fewer cards look more believable
    const n = Math.min(other.length, rng() < 0.7 ? 1 : 2);
    return other.slice(0, n);
  }

  // Mostly truthful: 1..min(3, matching) cards, leaning towards more
  const max = Math.min(3, matching.length);
  const n = Math.max(1, Math.min(max, Math.ceil(rng() * max + 0.3)));
  const picks = matching.slice(0, n);

  // Occasionally slip a non-matching card in (a bluff hidden among true cards)
  if (other.length > 0 && picks.length < 3 && rng() < 0.2) picks.push(other[0]);
  return picks;
}

/**
 * Decide the bot's move.
 * @param {object} view
 * @param {number[]} view.hand          bot's hand
 * @param {number[]} view.myPlayed      cards the bot played this round
 * @param {number}   view.tableCard
 * @param {object[]} view.playHistory   public history [{ playerId, cardsPlayed }]
 * @param {string}   view.botId
 * @param {number}   view.bonus         shared bonus pot
 * @param {Function} [rng]
 * @returns {{ action: 'play', indices: number[] } | { action: 'liar', pLie: number }}
 */
function decide({ hand, myPlayed = [], tableCard, playHistory = [], botId, bonus = 0 }, rng = Math.random) {
  const last = playHistory[playHistory.length - 1];

  if (last && last.playerId !== botId) {
    const earlierClaims = playHistory
      .slice(0, -1)
      .filter(p => p.playerId !== botId)
      .reduce((sum, p) => sum + p.cardsPlayed, 0);
    const pLie = 1 - probabilityTruthful({
      hand, myPlayed, tableCard, claimCount: last.cardsPlayed, earlierClaims,
    });

    // Expected gain of calling: +1+pot if right, −1 if wrong
    const ev = pLie * (1 + bonus) - (1 - pLie);
    const mustBluff = !hand.some(c => isMatching(c, tableCard));
    const threshold = (mustBluff ? -0.2 : 0.15) + (rng() - 0.5) * 0.3;
    if (pLie >= 0.999 || ev > threshold) return { action: 'liar', pLie };
  }

  return { action: 'play', indices: choosePlay(hand, tableCard, rng) };
}

module.exports = { decide, probabilityTruthful, choosePlay };
