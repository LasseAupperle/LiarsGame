/**
 * LobbyCreate.jsx - Form to create a new game lobby
 */

import { useState } from 'react';
import useGame from '../../hooks/useGame';

export default function LobbyCreate() {
  const [playerName, setPlayerName] = useState('');
  const [loading, setLoading] = useState(false);
  const { emit, setPlayerId, setPlayerName: setGamePlayerName, setGameCode, setStatus } = useGame();

  const handleCreateLobby = (e) => {
    e.preventDefault();
    if (!playerName.trim()) return;

    setLoading(true);
    emit('lobby:create', playerName, (response) => {
      setLoading(false);
      if (response.success) {
        setGamePlayerName(playerName);
        setPlayerId(response.playerId);
        setGameCode(response.lobbyCode);
        setStatus('lobby');
      } else {
        alert('Error creating lobby: ' + response.message);
      }
    });
  };

  return (
    <div className="lobby-create">
      <h2>Create New Game</h2>
      <form onSubmit={handleCreateLobby}>
        <input
          type="text"
          placeholder="Enter your name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          maxLength="20"
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Lobby'}
        </button>
      </form>
    </div>
  );
}
