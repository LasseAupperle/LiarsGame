import useGame from '../../hooks/useGame';

const cardColors = {
  1: '#e74c3c',
  2: '#000',
  3: '#000',
  4: '#f39c12'
};

const cardNames = {
  1: 'A',
  2: 'K',
  3: 'Q',
  4: 'J'
};

export default function PlayerHand({ hand = [] }) {
  const { selectedCards, toggleCard, cardsHidden } = useGame();

  return (
    <div className="player-hand">
      <h3>Your Hand</h3>
      <div className="cards-container">
        {hand.map((card, index) => (
          <button
            key={index}
            className={`card ${selectedCards.includes(index) ? 'selected' : ''} ${cardsHidden ? 'face-down' : ''}`}
            onClick={() => !cardsHidden && toggleCard(index)}
            style={{ borderColor: cardsHidden ? 'transparent' : cardColors[card] }}
          >
            <span className="card-value">{cardsHidden ? '?' : cardNames[card]}</span>
          </button>
        ))}
      </div>
      <p className="selection-info">Selected: {selectedCards.length} cards</p>
    </div>
  );
}
