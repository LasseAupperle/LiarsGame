/**
 * ScoreBoard.jsx - Display scores and bonus modifier
 */

import useGame from '../../hooks/useGame';

export default function ScoreBoard() {
  const { players, playerId, bonusModifier, roundNumber } = useGame();

  const yourPlayer = players.find((p) => p.id === playerId);

  return (
    <div className="scoreboard">
      <div className="round-info">
        <span>Round {roundNumber}</span>
      </div>

      <div className="your-score">
        <div className="score-label">Your Score</div>
        <div className="score-value">{yourPlayer?.mainScore || 0}</div>
      </div>

      <div className="bonus-modifier">
        <div className="bonus-label">Bonus</div>
        <div className={`bonus-value ${bonusModifier > 0 ? 'positive' : bonusModifier < 0 ? 'negative' : ''}`}>
          {bonusModifier > 0 ? '+' : ''}{bonusModifier}
        </div>
      </div>
    </div>
  );
}
