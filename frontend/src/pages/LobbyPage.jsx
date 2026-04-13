/**
 * LobbyPage.jsx - Choose between creating or joining a lobby
 */

import { useState } from 'react';
import LobbyCreate from '../components/Lobby/LobbyCreate';
import LobbyJoin from '../components/Lobby/LobbyJoin';
import LobbyRoom from '../components/Lobby/LobbyRoom';
import useGame from '../hooks/useGame';

export default function LobbyPage() {
  const [mode, setMode] = useState(null); // create | join | waiting
  const { gameCode } = useGame();

  // If in a lobby with code, show the room
  if (gameCode) {
    return <LobbyRoom />;
  }

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
          </div>
        )}

        {mode === 'create' && <LobbyCreate />}
        {mode === 'join' && <LobbyJoin />}
      </div>
    </div>
  );
}
