/**
 * CardVisibilityToggle.jsx - Button to hide/show own cards
 */

import { useState } from 'react';
import useHapticFeedback from '../../hooks/useHapticFeedback';

export default function CardVisibilityToggle() {
  const [cardsHidden, setCardsHidden] = useState(false);
  const { tap } = useHapticFeedback();

  const handleToggle = () => {
    tap();
    setCardsHidden(!cardsHidden);
  };

  return (
    <button className="card-visibility-toggle" onClick={handleToggle} title="Hide/show cards (H)">
      {cardsHidden ? '👁️ Show Cards' : '🔒 Hide Cards'}
    </button>
  );
}
