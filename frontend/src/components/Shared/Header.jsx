/**
 * Header.jsx - Game header with title and lobby code
 */

import useGame from '../../hooks/useGame';
import SoundToggle from './SoundToggle';
import KeyboardShortcutsHelp from './KeyboardShortcutsHelp';

export default function Header() {
  const { gameCode, playerName } = useGame();

  const copyToClipboard = () => {
    if (gameCode) {
      navigator.clipboard.writeText(gameCode);
      alert('Lobby code copied!');
    }
  };

  return (
    <div className="header">
      <div className="header-left">
        <h1>Liars Game</h1>
        {playerName && <p className="player-info">Playing as: {playerName}</p>}
      </div>

      <div className="header-center">
        {gameCode && (
          <div className="code-display" onClick={copyToClipboard} title="Click to copy">
            Code: <strong>{gameCode}</strong>
          </div>
        )}
      </div>

      <div className="header-right">
        <KeyboardShortcutsHelp />
        <SoundToggle />
      </div>
    </div>
  );
}
