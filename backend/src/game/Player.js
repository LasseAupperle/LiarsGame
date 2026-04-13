/**
 * Player.js - Player class for game state tracking
 */

class Player {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.hand = [];              // Cards in hand
    this.mainScore = 0;          // Primary score (round wins)
    this.bonusModifier = 0;      // Liar bonus tracker
    this.spectator = false;      // True if in tie-break and not top scorer
    this.cardsPlayedCount = 0;   // Cards played in current turn
  }

  addCard(card) {
    this.hand.push(card);
  }

  addCards(cards) {
    this.hand.push(...cards);
  }

  removeCard(cardIndex) {
    if (cardIndex < 0 || cardIndex >= this.hand.length) {
      throw new Error('Invalid card index');
    }
    return this.hand.splice(cardIndex, 1)[0];
  }

  removeCards(cardIndices) {
    // Sort indices in reverse to avoid shifting issues
    const sorted = cardIndices.sort((a, b) => b - a);
    return sorted.map(idx => this.removeCard(idx));
  }

  clearHand() {
    this.hand = [];
  }

  updateScore(delta) {
    this.mainScore = Math.max(0, this.mainScore + delta);
  }

  updateBonusModifier(delta) {
    this.bonusModifier = Math.max(0, this.bonusModifier + delta);
  }

  getState() {
    return {
      id: this.id,
      name: this.name,
      mainScore: this.mainScore,
      bonusModifier: this.bonusModifier,
      spectator: this.spectator,
      cardsLeft: this.hand.length,
      cardsPlayedCount: this.cardsPlayedCount
    };
  }
}

module.exports = Player;
