/**
 * LobbyBrowse.jsx - Browse and join open lobbies
 */

import { useState, useEffect } from 'react';
import useGame from '../../hooks/useGame';

export default function LobbyBrowse({ onBack, onJoinWithCode }) {
  const [lobbies, setLobbies] = useState([]);
  const [loading, setLoading] = useState(true);
  const { emit } = useGame();

  const fetchLobbies = () => {
    setLoading(true);
    emit('lobby:list', (response) => {
      setLoading(false);
      if (response?.success) {
        setLobbies(response.lobbies);
      }
    });
  };

  useEffect(() => {
    fetchLobbies();
  }, []);

  return (
    <div className="lobby-browse">
      <button className="btn-back" onClick={onBack}>← Back</button>
      <h2>Open Lobbies</h2>

      <button className="btn-refresh" onClick={fetchLobbies} disabled={loading}>
        {loading ? 'Loading...' : '↻ Refresh'}
      </button>

      {!loading && lobbies.length === 0 && (
        <p className="no-lobbies">No open lobbies. Create one!</p>
      )}

      {lobbies.length > 0 && (
        <ul className="lobby-list">
          {lobbies.map((lobby) => (
            <li key={lobby.code} className="lobby-list-item">
              <span className="lobby-code">{lobby.code}</span>
              <span className="lobby-players">{lobby.playerCount}/{lobby.maxPlayers} players</span>
              <button
                className="btn-primary btn-join-lobby"
                onClick={() => onJoinWithCode(lobby.code)}
              >
                Join
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
