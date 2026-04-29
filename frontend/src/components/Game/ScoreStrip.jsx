import useGame from '../../hooks/useGame';
import GameTimer from './GameTimer';

export default function ScoreStrip() {
  const { players, playerId: myId, currentPlayerId, roundNumber, gameSettings } = useGame();

  const sorted = [...(players || [])].sort((a, b) => (b.mainScore ?? 0) - (a.mainScore ?? 0));

  const modeLabel = gameSettings?.mode === 'short'
    ? 'SHORT'
    : gameSettings?.mode === 'timed'
    ? 'TIMED'
    : null;

  return (
    <div className="score-strip">
      {modeLabel && <span className={`mode-badge mode-${gameSettings.mode}`}>{modeLabel}</span>}
      {sorted.map((p, i) => (
        <span
          key={p.id}
          className={`score-chip ${p.id === myId ? 'self' : ''} ${p.id === currentPlayerId ? 'active' : ''}`}
        >
          #{i + 1} {p.name} — {p.mainScore ?? 0}pt
        </span>
      ))}
      <span className="score-strip-round">Round {roundNumber}</span>
      <GameTimer />
    </div>
  );
}
