/**
 * SoundToggle.jsx - Toggle sound effects on/off
 */

import useGame from '../../hooks/useGame';

export default function SoundToggle() {
  const { soundEnabled, toggleSound } = useGame();

  return (
    <button
      className="sound-toggle"
      onClick={toggleSound}
      title={soundEnabled ? 'Sound on' : 'Sound off'}
    >
      {soundEnabled ? '🔊' : '🔇'}
    </button>
  );
}
