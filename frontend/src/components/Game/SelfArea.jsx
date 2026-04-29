import useGame from '../../hooks/useGame';
import useHapticFeedback from '../../hooks/useHapticFeedback';
import PlayerHand from './PlayerHand';
import ActionButtons from './ActionButtons';
import RulesModal from './RulesModal';

export default function SelfArea() {
  const { myHand, cardsHidden, toggleCardsHidden } = useGame();
  const { tap } = useHapticFeedback();

  const handleToggle = () => { tap(); toggleCardsHidden(); };

  return (
    <div className="self-area">
      <div className="self-hand-row">
        <PlayerHand hand={myHand} />
        <button
          className="hide-icon-btn"
          onClick={handleToggle}
          title={cardsHidden ? 'Show cards (H)' : 'Hide cards (H)'}
        >
          {cardsHidden ? '👁' : '🔒'}
        </button>
      </div>
      <div className="self-action-row">
        <ActionButtons />
        <RulesModal />
      </div>
    </div>
  );
}
