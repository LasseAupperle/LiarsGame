import useGame from '../../hooks/useGame';

export default function DisconnectBanner() {
  const { disconnectedPlayers } = useGame();

  if (!disconnectedPlayers || disconnectedPlayers.length === 0) return null;

  return (
    <div className="disconnect-banner">
      {disconnectedPlayers.map(p => (
        <div key={p.playerId} className="disconnect-banner-item">
          <span className="disconnect-icon">⚠️</span>
          <span>{p.playerName} disconnected — 30s to rejoin</span>
        </div>
      ))}
    </div>
  );
}
