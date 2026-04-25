/**
 * LobbyJoin.jsx - Form to join an existing game lobby
 */

import { useState } from 'react';
import useGame from '../../hooks/useGame';

export default function LobbyJoin({ onBack, initialCode = '' }) {
  const [lobbyCode, setLobbyCode] = useState(initialCode);
  const [playerName, setPlayerName] = useState('');
  const [loading, setLoading] = useState(false);
  const { emit, setPlayerId, setPlayerName: setGamePlayerName, setGameCode, setStatus, setPlayers } = useGame();

  const handleJoinLobby = (e) => {
    e.preventDefault();
    if (!lobbyCode.trim() || !playerName.trim()) return;

    setLoading(true);
    emit('lobby:join', lobbyCode.toUpperCase(), playerName, (response) => {
      setLoading(false);
      if (response.success) {
        setGamePlayerName(playerName);
        setPlayerId(response.playerId);
        setPlayers(response.players);
        setGameCode(response.lobbyCode);
        setStatus('lobby');
      } else {
        alert('Error joining lobby: ' + response.message);
      }
    });
  };

  return (
    <div className="lobby-join">
      <button className="btn-back" onClick={onBack}>← Back</button>
      <h2>Join Game</h2>
      <form onSubmit={handleJoinLobby}>
        <input
          type="text"
          placeholder="Enter lobby code"
          value={lobbyCode}
          onChange={(e) => setLobbyCode(e.target.value.toUpperCase())}
          maxLength="5"
          required
        />
        <input
          type="text"
          placeholder="Enter your name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          maxLength="20"
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Joining...' : 'Join Lobby'}
        </button>
      </form>
    </div>
  );
}
