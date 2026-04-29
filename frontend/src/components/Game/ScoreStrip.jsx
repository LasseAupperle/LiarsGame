import useGame from '../../hooks/useGame';

export default function ScoreStrip() {
  const { players, playerId: myId, currentPlayerId, roundNumber } = useGame();

  const sorted = [...(players || [])].sort((a, b) => (b.mainScore ?? 0) - (a.mainScore ?? 0));

  return (
    <div className="score-strip">
      {sorted.map((p, i) => (
        <span
          key={p.id}
          className={`score-chip ${p.id === myId ? 'self' : ''} ${p.id === currentPlayerId ? 'active' : ''}`}
        >
          #{i + 1} {p.name} — {p.mainScore ?? 0}pt
        </span>
      ))}
      <span className="score-strip-round">Round {roundNumber}</span>
    </div>
  );
}
