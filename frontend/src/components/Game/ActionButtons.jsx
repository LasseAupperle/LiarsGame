/**
 * ActionButtons.jsx - Context-aware action buttons
 */

import useGame from '../../hooks/useGame';
import useSound from '../../hooks/useSound';
import { toast } from '../../store/uiStore';

export default function ActionButtons({ onPlay, onLiar }) {
  const {
    isYourTurn,
    selectedCards,
    clearSelection,
    emit,
    gameCode,
    history,
    players,
    currentPlayerId
  } = useGame();
  const { playSound } = useSound();

  const handlePlay = () => {
    if (selectedCards.length === 0 || selectedCards.length > 3) {
      toast('Select 1–3 cards', 'info');
      return;
    }

    playSound('card-place');
    emit('game:play', gameCode, selectedCards, (response) => {
      if (response.success) {
        clearSelection();
        onPlay?.(response);
      } else {
        toast(response.message, 'error');
      }
    });
  };

  const handleCallLiar = () => {
    playSound('liar-call');
    emit('game:callLiar', gameCode, (response) => {
      if (response.success) {
        onLiar?.(response);
      } else {
        toast(response.message, 'error');
      }
    });
  };

  if (!isYourTurn) {
    const currentPlayer = players.find(p => p.id === currentPlayerId);
    const waitingFor = currentPlayer?.name || 'someone';
    return (
      <div className="action-buttons">
        <p className="waiting-text">Waiting for {waitingFor}...</p>
      </div>
    );
  }

  const canCallLiar = history.length > 0;

  return (
    <div className="action-buttons">
      <button
        className="btn-primary"
        onClick={handlePlay}
        disabled={selectedCards.length === 0 || selectedCards.length > 3}
      >
        Play {selectedCards.length > 0 ? selectedCards.length : ''} Cards
      </button>
      {canCallLiar && (
        <button className="btn-danger" onClick={handleCallLiar}>
          Call Liar
        </button>
      )}
    </div>
  );
}
