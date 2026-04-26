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

  const cardName = cardNames[winningCard] || '?';
  const lastPlay = history.length > 0 ? history[history.length - 1] : null;

  return (
    <div className="card-display">
      <div className="table-card-banner">
        <span className="table-card-label">Table Card</span>
        <span className="table-card-name">{cardName}</span>
      </div>
      {lastPlay ? (
        <div className="claim-info">
          <p className="player-name">{lastPlay.playerName}</p>
          <p className="claim-text">
            Played <span className="amount">{lastPlay.cardsPlayed}</span> {cardName}
            {lastPlay.cardsPlayed > 1 ? 's' : ''}
          </p>
        </div>
      ) : (
        <p className="waiting-first-play">Waiting for first play...</p>
      )}
    </div>
  );
}
