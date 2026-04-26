import useGame from '../../hooks/useGame';

export default function PlayerPanel() {
  const { players, playerId, currentPlayerId, roundNumber } = useGame();

  const sorted = [...players].sort((a, b) => b.mainScore - a.mainScore);

  return (
    <div className="player-panel">
      <div className="leaderboard">
        <div className="leaderboard-header">
          <span>Leaderboard</span>
          <span className="round-badge">Round {roundNumber}</span>
        </div>
        <div className="leaderboard-list">
          {sorted.map((player, i) => (
            <div
              key={player.id}
              className={`leaderboard-row ${player.id === currentPlayerId ? 'active-turn' : ''} ${player.id === playerId ? 'self' : ''} ${player.spectator ? 'spectator' : ''}`}
            >
              <span className="lb-rank">#{i + 1}</span>
              <span className="lb-name">
                {player.name}
                {player.id === playerId && ' (You)'}
                {player.id === currentPlayerId && ' 🎯'}
              </span>
              <span className="lb-cards">{player.cardsLeft} 🎴</span>
              <span className="lb-score">{player.mainScore} pts</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
