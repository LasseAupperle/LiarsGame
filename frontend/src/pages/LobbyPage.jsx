/**
 * LobbyPage.jsx - Choose between creating, joining, or browsing lobbies
 */

import { useState } from 'react';
import LobbyCreate from '../components/Lobby/LobbyCreate';
import LobbyJoin from '../components/Lobby/LobbyJoin';
import LobbyBrowse from '../components/Lobby/LobbyBrowse';
import LobbyRoom from '../components/Lobby/LobbyRoom';
import useGame from '../hooks/useGame';

export default function LobbyPage() {
  const [mode, setMode] = useState(null); // null | create | join | browse
  const [prefilledCode, setPrefilledCode] = useState('');
  const { gameCode } = useGame();

  if (gameCode) {
    return <LobbyRoom />;
  }

  const handleJoinWithCode = (code) => {
    setPrefilledCode(code);
    setMode('join');
  };

  const handleBack = () => {
    setMode(null);
    setPrefilledCode('');
  };

  return (
    <div className="lobby-page">
      <div className="lobby-container">
        <h1 className="page-title">Liars Game</h1>
        <p className="subtitle">A game of bluffing and deception</p>

        {!mode && (
          <div className="mode-buttons">
            <button className="btn-primary" onClick={() => setMode('create')}>
              Create Game
            </button>
            <button className="btn-primary" onClick={() => setMode('join')}>
              Join Game
            </button>
            <button className="btn-secondary" onClick={() => setMode('browse')}>
              Browse Games
            </button>
          </div>
        )}

        {mode === 'create' && <LobbyCreate onBack={handleBack} />}
        {mode === 'join' && <LobbyJoin onBack={handleBack} initialCode={prefilledCode} />}
        {mode === 'browse' && (
          <LobbyBrowse onBack={handleBack} onJoinWithCode={handleJoinWithCode} />
        )}
      </div>
    </div>
  );
}
