/**
 * rules.js - Core validation and scoring logic
 */

/**
 * Check if played cards are truthful (match winning card or are jokers)
 * @param {number[]} cards - Cards played (1-4)
 * @param {number} winningCard - Winning card for the round (1-3)
 * @returns {boolean}
 */
function isTruthful(cards, winningCard) {
  return cards.every(card => card === winningCard || card === 4); // 4 = Joker
}

/**
 * Calculate score changes after liar resolution
 * @param {boolean} isLiarCorrect - Was the liar call correct?
 * @param {boolean} wasCallerCorrect - Did the caller call the right player?
 * @param {number} bonusModifier - Current bonus modifier
 * @returns {{ liarScore: number, callerScore: number, othersScore: number }}
 */
function calculateScoreChange(isLiarCorrect, bonusModifier) {
  if (isLiarCorrect) {
    // Liar was called correctly: caller gains +1 + bonus, liar loses -1
    return {
      liarScore: -1,
      callerScore: 1 + bonusModifier,
      othersScore: 1 // Others gain for truthfully playing
    };
  } else {
    // Liar was called incorrectly: caller loses -1, liar and others gain +1
    return {
      liarScore: 1,
      callerScore: -1,
      othersScore: 1
    };
  }
}

/**
 * Check if any player has reached tie-break condition
 * @param {Player[]} players
 * @param {number} threshold - score threshold (default 20)
 * @returns {boolean}
 */
function shouldEnterTiebreak(players, threshold = 20) {
  return players.some(p => p.mainScore >= threshold);
}

/**
 * Get active players for tie-break: only highest-scorers remain
 * @param {Player[]} players
 * @param {number} threshold
 * @returns {Player[]}
 */
function getActivePlayers(players, threshold = 20) {
  if (!shouldEnterTiebreak(players, threshold)) {
    return players.filter(p => !p.spectator);
  }
  const maxScore = Math.max(...players.map(p => p.mainScore));
  return players.filter(p => p.mainScore === maxScore);
}

/**
 * Check if game has a definitive winner
 * @param {Player[]} players
 * @param {number} threshold
 * @returns {Player|null}
 */
function getWinner(players, threshold = 20) {
  const activePlayers = getActivePlayers(players, threshold);
  if (activePlayers.length === 1 && activePlayers[0].mainScore >= threshold) {
    return activePlayers[0];
  }
  return null;
}

module.exports = {
  isTruthful,
  calculateScoreChange,
  shouldEnterTiebreak,
  getActivePlayers,
  getWinner
};
