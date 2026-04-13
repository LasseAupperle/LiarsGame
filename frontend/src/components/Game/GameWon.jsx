/**
 * GameWon.jsx - Victory screen
 */

import useGame from '../../hooks/useGame';

export default function GameWon({ winnerId, winnerName, finalScore }) {
  const { players, playerId, reset } = useGame();

  const handlePlayAgain = () => {
    reset();
    window.location.href = '/';
  };

  return (
    <div className="game-won-overlay">
      <div className="game-won-modal">
        <h1 className="winner-title">🎉 Game Over! 🎉</h1>

        <div className="winner-info">
          <h2 className="winner-name">{winnerName}</h2>
          <p className="winner-score">{finalScore} points</p>
          {winnerId === playerId && <p className="you-won">You won!</p>}
        </div>

        <div className="final-scores">
          <h3>Final Scores</h3>
          <ul>
            {players
              .sort((a, b) => b.mainScore - a.mainScore)
              .map((player) => (
                <li key={player.id} className={player.id === playerId ? 'you' : ''}>
                  <span className="name">{player.name}</span>
                  <span className="score">{player.mainScore} pts</span>
                </li>
              ))}
          </ul>
        </div>

        <button className="btn-primary play-again-btn" onClick={handlePlayAgain}>
          Play Again
        </button>
      </div>
    </div>
  );
}
