/**
 * PlayerHand.jsx - Display and interact with your cards
 */

import useGame from '../../hooks/useGame';

const cardColors = {
  1: '#e74c3c', // Ace - Red
  2: '#000',    // King - Black
  3: '#000',    // Queen - Black
  4: '#f39c12'  // Joker - Gold
};

const cardNames = {
  1: 'A',  // Ace
  2: 'K',  // King
  3: 'Q',  // Queen
  4: 'J'   // Joker
};

export default function PlayerHand({ hand = [] }) {
  const { selectedCards, toggleCard } = useGame();

  return (
    <div className="player-hand">
      <h3>Your Hand</h3>
      <div className="cards-container">
        {hand.map((card, index) => (
          <button
            key={index}
            className={`card ${selectedCards.includes(index) ? 'selected' : ''}`}
            onClick={() => toggleCard(index)}
            style={{ borderColor: cardColors[card] }}
          >
            <span className="card-value">{cardNames[card]}</span>
          </button>
        ))}
      </div>
      <p className="selection-info">Selected: {selectedCards.length} cards</p>
    </div>
  );
}
