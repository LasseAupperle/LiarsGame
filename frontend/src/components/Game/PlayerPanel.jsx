/**
 * PlayerPanel.jsx - Display other players' status
 */

import useGame from '../../hooks/useGame';

export default function PlayerPanel() {
  const { players, playerId, currentPlayerId } = useGame();

  const otherPlayers = players.filter((p) => p.id !== playerId);

  return (
    <div className="player-panel">
      <h3>Other Players</h3>
      <div className="players-grid">
        {otherPlayers.map((player) => (
          <div
            key={player.id}
            className={`player-card ${player.id === currentPlayerId ? 'active-turn' : ''} ${
              player.spectator ? 'spectator' : ''
            }`}
          >
            <div className="player-name">{player.name}</div>
            <div className="player-score">{player.mainScore} pts</div>
            <div className="player-cards">{player.cardsLeft} 🎴</div>
            {player.spectator && <div className="badge">Spectator</div>}
            {player.id === currentPlayerId && <div className="badge active">Turn</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
