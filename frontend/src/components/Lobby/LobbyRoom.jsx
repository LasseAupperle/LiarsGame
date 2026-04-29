import { useEffect, useState } from 'react';
import useGame from '../../hooks/useGame';

const AVATAR_COLORS = ['#6c5ce7', '#00b894', '#e17055', '#0984e3', '#fd79a8', '#fdcb6e'];

function getAvatarColor(name) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

function getInitials(name) {
  return name.charAt(0).toUpperCase();
}

export default function LobbyRoom() {
  const {
    gameCode,
    playerId,
    players,
    setPlayers,
    setStatus,
    acceptGameState,
    setMyHand,
    setGameSettings,
    gameSettings,
    emit,
    on,
    off,
    connected
  } = useGame();

  const [canStart, setCanStart] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!connected) return;

    const handleLobbyUpdate = (data) => {
      if (data.lobbyCode === gameCode) {
        setPlayers(data.players);
      }
    };

    const handleGameStart = (data) => {
      if (data.gameState) {
        acceptGameState(data.gameState);
        if (data.settings) setGameSettings(data.settings, data.endTime || null);
        setStatus('playing');
      }
    };

    const handleHand = (hand) => {
      setMyHand(hand);
    };

    on('lobby:updated', handleLobbyUpdate);
    on('game:started', handleGameStart);
    on('game:hand', handleHand);

    return () => {
      off('lobby:updated', handleLobbyUpdate);
      off('game:started', handleGameStart);
      off('game:hand', handleHand);
    };
  }, [connected, gameCode, setPlayers, setStatus, acceptGameState, setMyHand, on, off]);

  useEffect(() => {
    const isHost = players.length > 0 && players[0].id === playerId;
    setCanStart(isHost && players.length >= 2 && players.length <= 4);
  }, [players, playerId]);

  const handleStartGame = () => {
    emit('lobby:start', (response) => {
      if (response.success && response.gameState) {
        acceptGameState(response.gameState);
        setStatus('playing');
      } else if (!response.success) {
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

  const handleCopyCode = () => {
    navigator.clipboard.writeText(gameCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const isHost = players.length > 0 && players[0].id === playerId;

  const modeBadgeText = gameSettings?.mode === 'short'
    ? 'Short Game — 10 pts'
    : gameSettings?.mode === 'timed'
    ? `Timed — ${gameSettings.timedMinutes} min`
    : 'Standard — 20 pts';

  return (
    <div className="lobby-room">
      {gameSettings && (
        <div className={`lobby-mode-badge mode-${gameSettings.mode}`}>{modeBadgeText}</div>
      )}
      <div className="lobby-code-section">
        <p className="lobby-code-label">Game Code</p>
        <button className="lobby-code-block" onClick={handleCopyCode} title="Click to copy">
          {gameCode}
        </button>
        <p className="lobby-code-hint">{copied ? 'Copied!' : 'Tap to copy'}</p>
      </div>

      <div className="lobby-players-section">
        <h3>Players ({players.length}/4)</h3>
        <div className="lobby-avatars">
          {players.map((player, index) => (
            <div key={player.id} className="player-avatar-wrap">
              {index === 0 && <span className="host-crown">👑</span>}
              <div
                className="player-avatar"
                style={{ backgroundColor: getAvatarColor(player.name) }}
              >
                {getInitials(player.name)}
              </div>
              <span className="avatar-name">
                {player.name}
                {player.id === playerId && ' (You)'}
              </span>
            </div>
          ))}
          {Array.from({ length: 4 - players.length }).map((_, i) => (
            <div key={`empty-${i}`} className="player-avatar-wrap">
              <div className="player-avatar player-avatar-empty">+</div>
              <span className="avatar-name">Waiting...</span>
            </div>
          ))}
        </div>
      </div>

      <div className="lobby-status">
        {players.length < 2 && <p className="waiting-text">Need at least 2 players to start</p>}
        {players.length >= 2 && !isHost && <p className="waiting-text">Waiting for host to start...</p>}
      </div>

      <div className="lobby-actions">
        {canStart && (
          <button className="btn-primary" onClick={handleStartGame}>
            Start Game
          </button>
        )}
        <button className="btn-secondary" onClick={handleLeaveLobby}>
          Leave Lobby
        </button>
      </div>
    </div>
  );
}
