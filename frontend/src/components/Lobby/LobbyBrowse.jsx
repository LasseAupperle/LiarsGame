import { useState, useEffect, useRef } from 'react';
import useGame from '../../hooks/useGame';

const SESSION_KEY = 'lg_session';

export default function LobbyBrowse({ onBack, onJoinWithCode }) {
  const [lobbies, setLobbies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rejoinable, setRejoinable] = useState(null); // { lobbyCode, playerId, playerName } | null
  const { emit, connected, setPlayerId, setPlayerName, setGameCode, acceptGameState, setStatus, setMyHand, saveSession } = useGame();
  const timeoutRef = useRef(null);

  const fetchLobbies = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setLoading(true);
    setError(null);

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
    if (!connected) return;

    // Check stored session for potential rejoin
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const session = JSON.parse(raw);
        emit('game:checkRejoin', { lobbyCode: session.gameCode, playerId: session.playerId }, (res) => {
          if (res?.canRejoin) setRejoinable(session);
          else localStorage.removeItem(SESSION_KEY);
        });
      }
    } catch {
      localStorage.removeItem(SESSION_KEY);
    }

    fetchLobbies();
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [connected]);

  const handleRejoin = () => {
    if (!rejoinable) return;
    emit('game:rejoin', rejoinable.gameCode, rejoinable.playerId, (res) => {
      if (res.success) {
        setPlayerName(rejoinable.playerName);
        setPlayerId(rejoinable.playerId);
        setGameCode(rejoinable.gameCode);
        acceptGameState(res.gameState);
        if (res.hand) setMyHand(res.hand);
        setStatus('playing');
        saveSession();
      } else {
        localStorage.removeItem(SESSION_KEY);
        setRejoinable(null);
        alert('Could not rejoin: ' + res.message);
      }
    });
  };

  return (
    <div className="lobby-browse">
      <button className="btn-back" onClick={onBack}>← Back</button>
      <h2>Lobbies</h2>

      {rejoinable && (
        <div className="rejoin-banner">
          <span>You were in game <strong>{rejoinable.gameCode}</strong></span>
          <button className="btn-rejoin" onClick={handleRejoin}>Rejoin</button>
        </div>
      )}

      <button className="btn-refresh" onClick={fetchLobbies} disabled={loading || !connected}>
        {loading ? 'Loading...' : '↻ Refresh'}
      </button>

      {error && <p className="no-lobbies" style={{ color: 'var(--red)' }}>{error}</p>}

      {!loading && !error && lobbies.length === 0 && (
        <p className="no-lobbies">No open lobbies. Create one!</p>
      )}

      {lobbies.length > 0 && (
        <ul className="lobby-list">
          {lobbies.map((lobby) => {
            const isMyRejoin = rejoinable?.lobbyCode === lobby.code;
            const isPlaying = lobby.status === 'playing';
            const isFull = lobby.playerCount >= lobby.maxPlayers;
            return (
              <li key={lobby.code} className={`lobby-list-item ${isPlaying ? 'in-progress' : ''}`}>
                <div className="lobby-item-info">
                  <span className="lobby-code">{lobby.code}</span>
                  {isPlaying && <span className="lobby-status-badge">Round {lobby.roundNumber || '?'}</span>}
                  <span className="lobby-players">{lobby.playerCount}/{lobby.maxPlayers} players</span>
                </div>
                {isMyRejoin ? (
                  <button className="btn-rejoin btn-join-lobby" onClick={handleRejoin}>Rejoin</button>
                ) : isPlaying ? (
                  <button
                    className="btn-secondary btn-join-lobby"
                    disabled={isFull}
                    onClick={() => onJoinWithCode(lobby.code)}
                  >
                    {isFull ? 'Full' : 'Join'}
                  </button>
                ) : (
                  <button className="btn-primary btn-join-lobby" onClick={() => onJoinWithCode(lobby.code)}>
                    Join
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
