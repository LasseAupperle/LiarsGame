/**
 * ActionButtons.jsx - Context-aware action buttons
 */

import useGame from '../../hooks/useGame';
import useSound from '../../hooks/useSound';

export default function ActionButtons({ onPlay, onLiar }) {
  const {
    isYourTurn,
    selectedCards,
    emit,
    gameCode,
    playerId
  } = useGame();
  const { playSound } = useSound();

  const handlePlay = () => {
    if (selectedCards.length === 0 || selectedCards.length > 3) {
      alert('Select 1-3 cards');
      return;
    }

    playSound('card-place');
    emit('game:play', gameCode, selectedCards, (response) => {
      if (response.success) {
        onPlay?.(response);
      } else {
        alert('Error: ' + response.message);
      }
    });
  };

  const handleCallLiar = () => {
    playSound('liar-call');
    emit('game:callLiar', gameCode, (response) => {
      if (response.success) {
        onLiar?.(response);
      } else {
        alert('Error: ' + response.message);
      }
    });
  };

  if (!isYourTurn) {
    return (
      <div className="action-buttons">
        <button className="btn-danger" onClick={handleCallLiar}>
          Call Liar
        </button>
      </div>
    );
  }

  return (
    <div className="action-buttons">
      <button
        className="btn-primary"
        onClick={handlePlay}
        disabled={selectedCards.length === 0 || selectedCards.length > 3}
      >
        Play {selectedCards.length > 0 ? selectedCards.length : ''} Cards
      </button>
    </div>
  );
}
