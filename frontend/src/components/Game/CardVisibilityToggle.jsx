import useGame from '../../hooks/useGame';
import useHapticFeedback from '../../hooks/useHapticFeedback';

export default function CardVisibilityToggle() {
  const { cardsHidden, toggleCardsHidden } = useGame();
  const { tap } = useHapticFeedback();

  const handleToggle = () => {
    tap();
    toggleCardsHidden();
  };

  return (
    <button className="card-visibility-toggle" onClick={handleToggle} title="Hide/show cards (H)">
      {cardsHidden ? '👁️ Show Cards' : '🔒 Hide Cards'}
    </button>
  );
}
