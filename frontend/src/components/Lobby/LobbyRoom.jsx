/**
 * LobbyRoom.jsx - Waiting room showing players and start button
 */

import { useEffect, useState } from 'react';
import useGame from '../../hooks/useGame';

export default function LobbyRoom() {
  const {
    gameCode,
    playerId,
    players,
    setPlayers,
    emit,
    on,
    off,
    connected
  } = useGame();

  const [canStart, setCanStart] = useState(false);

  useEffect(() => {
    if (!connected) return;

    const handleLobbyUpdate = (data) => {
      if (data.lobbyCode === gameCode) {
        setPlayers(data.players);
      }
    };

    const handleGameStart = (data) => {
      if (data.lobbyCode === gameCode) {
        // Game will start, transition handled by parent
      }
    };

    on('lobby:updated', handleLobbyUpdate);
    on('game:started', handleGameStart);

    return () => {
      off('lobby:updated', handleLobbyUpdate);
      off('game:started', handleGameStart);
    };
  }, [connected, gameCode, setPlayers, on, off]);

  useEffect(() => {
    // Can start if you're the first player and there are 2-4 players
    const isHost = players.length > 0 && players[0].id === playerId;
    setCanStart(isHost && players.length >= 2 && players.length <= 4);
  }, [players, playerId]);

  const handleStartGame = () => {
    emit('lobby:start', (response) => {
      if (!response.success) {
        alert('Error starting game: ' + response.message);
      }
    });
  };

  const handleLeaveLobby = () => {
    emit('lobby:leave', (response) => {
      if (response.success) {
        window.location.href = '/';
      }
    });
  };

  return (
    <div className="lobby-room">
      <h2>Lobby: {gameCode}</h2>
      <p className="code-display">Share this code with friends: <strong>{gameCode}</strong></p>

      <div className="players-list">
        <h3>Players ({players.length}/4)</h3>
        <ul>
          {players.map((player) => (
            <li key={player.id}>
              {player.name}
              {player.id === playerId && ' (You)'}
            </li>
          ))}
        </ul>
      </div>

      <div className="actions">
        {canStart && (
          <button className="btn-primary" onClick={handleStartGame}>
            Start Game
          </button>
        )}
        {!canStart && <p>Waiting for host to start...</p>}
        <button className="btn-secondary" onClick={handleLeaveLobby}>
          Leave Lobby
        </button>
      </div>
    </div>
  );
}
