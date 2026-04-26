import useGame from '../../hooks/useGame';

const CARD_IMAGES = {
  1: '/assets/cards/Ace.png',
  2: '/assets/cards/King.png',
  3: '/assets/cards/Queen.png',
  4: '/assets/cards/Joker.png',
};

const cardNames = { 1: 'Ace', 2: 'King', 3: 'Queen', 4: 'Joker' };

export default function PlayerHand({ hand = [] }) {
  const { selectedCards, toggleCard, cardsHidden } = useGame();

  return (
    <div className="player-hand">
      <h3>Your Hand</h3>
      <div className="cards-container">
        {hand.map((card, index) => {
          const selected = selectedCards.includes(index);
          return (
            <div
              key={index}
              className={`hand-card-wrap ${selected ? 'selected' : ''}`}
              onClick={() => !cardsHidden && toggleCard(index)}
            >
              <img
                src={cardsHidden ? '/assets/cards/card_back.png' : CARD_IMAGES[card]}
                alt={cardsHidden ? 'Hidden' : cardNames[card]}
                className="hand-card-img"
                draggable={false}
              />
            </div>
          );
        })}
      </div>
      <p className="selection-info">Selected: {selectedCards.length} cards</p>
    </div>
  );
}
