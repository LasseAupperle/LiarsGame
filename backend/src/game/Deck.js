/**
 * Deck.js - Playing card deck definition and operations
 * Cards: 6 Aces (1), 6 Kings (2), 6 Queens (3), 2 Jokers (4) = 20 total
 */

class Deck {
  constructor() {
    this.cards = this.initializeDeck();
  }

  initializeDeck() {
    const cards = [];
    // 6 Aces
    for (let i = 0; i < 6; i++) cards.push(1);
    // 6 Kings
    for (let i = 0; i < 6; i++) cards.push(2);
    // 6 Queens
    for (let i = 0; i < 6; i++) cards.push(3);
    // 2 Jokers
    for (let i = 0; i < 2; i++) cards.push(4);
    return cards;
  }

  shuffle() {
    // Fisher-Yates shuffle
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  deal(count) {
    if (count > this.cards.length) {
      throw new Error(`Not enough cards to deal ${count}`);
    }
    return this.cards.splice(0, count);
  }

  static validateCard(card) {
    return [1, 2, 3, 4].includes(card);
  }

  static getCardName(card) {
    const names = { 1: 'Ace', 2: 'King', 3: 'Queen', 4: 'Joker' };
    return names[card] || 'Unknown';
  }
}

module.exports = Deck;
