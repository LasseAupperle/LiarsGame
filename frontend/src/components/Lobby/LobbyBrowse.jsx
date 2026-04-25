import { useState, useEffect, useRef } from 'react';
import useGame from '../../hooks/useGame';

export default function LobbyBrowse({ onBack, onJoinWithCode }) {
  const [lobbies, setLobbies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { emit, connected } = useGame();
  const timeoutRef = useRef(null);

  const fetchLobbies = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setLoading(true);
    setError(null);

    // 5-second timeout if callback never fires
    timeoutRef.current = setTimeout(() => {
      setLoading(false);
      setError('Could not reach server. Check connection.');
    }, 5000);

    emit('lobby:list', (response) => {
      clearTimeout(timeoutRef.current);
      setLoading(false);
      if (response?.success) {
        setLobbies(response.lobbies || []);
      } else {
        setError('Failed to load lobbies.');
      }
    });
  };

  useEffect(() => {
    if (connected) fetchLobbies();
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [connected]);

  return (
    <div className="lobby-browse">
      <button className="btn-back" onClick={onBack}>← Back</button>
      <h2>Open Lobbies</h2>

      <button className="btn-refresh" onClick={fetchLobbies} disabled={loading || !connected}>
        {loading ? 'Loading...' : '↻ Refresh'}
      </button>

      {error && <p className="no-lobbies" style={{ color: 'var(--red)' }}>{error}</p>}

      {!loading && !error && lobbies.length === 0 && (
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
