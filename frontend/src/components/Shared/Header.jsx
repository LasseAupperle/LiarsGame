/**
 * Header.jsx - Game header with title and lobby code
 */

import useGame from '../../hooks/useGame';
import useGameStore from '../../store/gameStore';
import useUIStore from '../../store/uiStore';
import VolumeControl from './VolumeControl';
import KeyboardShortcutsHelp from './KeyboardShortcutsHelp';

export default function Header() {
  const { gameCode, playerName, isYourTurn, currentPlayerId, players, status, emit } = useGame();

  const copyToClipboard = () => {
    if (gameCode) {
      navigator.clipboard.writeText(gameCode);
      alert('Lobby code copied!');
    }
  };

  const handleExit = () => {
    if (window.confirm('Leave the game and return to main menu?')) {
      emit('lobby:leave', () => {});
      useGameStore.getState().reset();
      useUIStore.getState().reset();
    }
  };

  const currentPlayer = players?.find(p => p.id === currentPlayerId);
  const turnLabel = isYourTurn
    ? 'Your turn'
    : currentPlayer
      ? `${currentPlayer.name}'s turn`
      : '';

  return (
    <div className="header">
      <div className="header-left">
        <h1>Liars Game</h1>
        {playerName && <p className="player-info">Playing as: {playerName}</p>}
      </div>

      <div className="header-center">
        {turnLabel && (
          <div className={`turn-indicator ${isYourTurn ? 'your-turn' : 'other-turn'}`}>
            {turnLabel}
          </div>
        )}
        {gameCode && (
          <div className="code-display" onClick={copyToClipboard} title="Click to copy">
            Code: <strong>{gameCode}</strong>
          </div>
        )}
      </div>

      <div className="header-right">
        <KeyboardShortcutsHelp />
        <VolumeControl />
        {status === 'playing' && (
          <button className="btn-icon btn-exit" onClick={handleExit} title="Exit to main menu">
            ⬅
          </button>
        )}
      </div>
    </div>
  );
}
