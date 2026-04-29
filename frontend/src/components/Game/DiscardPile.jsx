import useGame from '../../hooks/useGame';

const CARD_BACK = '/assets/cards/card_back.png';

export default function DiscardPile() {
  const { discardPile } = useGame();

  if (!discardPile || discardPile.length === 0) return null;

  const visible = discardPile.slice(-5);

  return (
    <div className="discard-pile" title={`${discardPile.length} past round(s)`}>
      <div className="discard-stack">
        {visible.map((_, i) => (
          <img
            key={i}
            src={CARD_BACK}
            alt="past round"
            className="discard-card"
            style={{ top: i * -2, left: i * 1 }}
          />
        ))}
      </div>
      <span className="discard-label">×{discardPile.length}</span>
    </div>
  );
}
