/**
 * CardDisplay.jsx - Shows current claim (e.g., "3 Kings")
 */

import useGame from '../../hooks/useGame';

const cardNames = {
  1: 'Ace',
  2: 'King',
  3: 'Queen',
  4: 'Joker'
};

export default function CardDisplay() {
  const { history, winningCard } = useGame();

  if (history.length === 0) {
    return (
      <div className="card-display">
        <p>Waiting for first play...</p>
      </div>
    );
  }

  const lastPlay = history[history.length - 1];
  const cardName = cardNames[winningCard] || '?';

  return (
    <div className="card-display">
      <div className="claim-info">
        <p className="player-name">{lastPlay.playerName}</p>
        <p className="claim-text">
          Played <span className="amount">{lastPlay.cardsPlayed}</span> {cardName}
          {lastPlay.cardsPlayed > 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}
