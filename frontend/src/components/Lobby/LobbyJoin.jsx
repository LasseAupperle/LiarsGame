/**
 * LobbyJoin.jsx - Form to join an existing game lobby
 */

import { useState } from 'react';
import useGame from '../../hooks/useGame';
import { toast } from '../../store/uiStore';

export default function LobbyJoin({ onBack, initialCode = '' }) {
  const [lobbyCode, setLobbyCode] = useState(initialCode);
  const [playerName, setPlayerName] = useState('');
  const [loading, setLoading] = useState(false);
  const { emit, setPlayerId, setSessionToken, setPlayerName: setGamePlayerName, setGameCode, setStatus, setPlayers, saveSession, acceptGameState, setMyHand, setGameSettings } = useGame();

  const handleJoinLobby = (e) => {
    e.preventDefault();
    if (!lobbyCode.trim() || !playerName.trim()) return;

    setLoading(true);
    emit('lobby:join', lobbyCode.toUpperCase(), playerName, (response) => {
      setLoading(false);
      if (!response.success) {
        toast('Could not join: ' + response.message, 'error');
        return;
      }

      setGamePlayerName(playerName);
      setPlayerId(response.playerId);
      setSessionToken(response.token);
      setGameCode(response.lobbyCode);

      if (response.joinedRunning) {
        // Mid-game join: fetch current state via rejoin
        emit('game:rejoin', response.lobbyCode, response.token, (rejoinRes) => {
          if (rejoinRes.success) {
            acceptGameState(rejoinRes.gameState);
            if (rejoinRes.hand) setMyHand(rejoinRes.hand);
            if (rejoinRes.settings) setGameSettings(rejoinRes.settings, rejoinRes.endTime || null);
            setStatus('playing');
            saveSession();
          } else {
            setStatus('lobby');
          }
        });
      } else {
        setPlayers(response.players);
        setStatus('lobby');
        saveSession();
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
