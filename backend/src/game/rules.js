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
 * Check if any player has reached tie-break condition (>= 20 points)
 * @param {Player[]} players - Array of player objects
 * @returns {boolean}
 */
function shouldEnterTiebreak(players) {
  return players.some(p => p.mainScore >= 20);
}

/**
 * Get active player list for tie-break mode
 * Only players with the highest score remain active
 * @param {Player[]} players - Array of player objects
 * @returns {Player[]}
 */
function getActivePlayers(players) {
  if (!shouldEnterTiebreak(players)) {
    return players.filter(p => !p.spectator);
  }

  const maxScore = Math.max(...players.map(p => p.mainScore));
  return players.filter(p => p.mainScore === maxScore);
}

/**
 * Check if game has a definitive winner
 * @param {Player[]} players - Array of player objects
 * @returns {Player|null}
 */
function getWinner(players) {
  const activePlayers = getActivePlayers(players);

  if (activePlayers.length === 1) {
    const player = activePlayers[0];
    if (player.mainScore >= 20) {
      return player;
    }
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
