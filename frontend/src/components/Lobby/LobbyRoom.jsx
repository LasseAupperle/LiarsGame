import { useEffect, useState } from 'react';
import useGame from '../../hooks/useGame';
import { toast } from '../../store/uiStore';

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
    hostId,
    setHostId,
    setPlayers,
    setStatus,
    acceptGameState,
    setMyHand,
    setGameSettings,
    gameSettings,
    emit,
    on,
    off,
    connected,
    clearSession
  } = useGame();

  const [canStart, setCanStart] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!connected) return;

    const handleLobbyUpdate = (data) => {
      if (data.lobbyCode === gameCode) {
        setPlayers(data.players);
        if (data.host) setHostId(data.host);
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
  }, [connected, gameCode, setPlayers, setHostId, setStatus, acceptGameState, setMyHand, on, off]);

  const hostPlayerId = hostId ?? players.find(p => !p.isBot)?.id;
  const isHost = hostPlayerId === playerId;

  useEffect(() => {
    setCanStart(isHost && players.length >= 2 && players.length <= 4);
  }, [players, isHost]);

  const handleAddBot = () => {
    emit('lobby:addBot', (res) => {
      if (!res?.success) toast(res?.message || 'Could not add bot', 'error');
    });
  };

  const handleRemoveBot = (botId) => {
    emit('lobby:removeBot', botId, (res) => {
      if (!res?.success) toast(res?.message || 'Could not remove bot', 'error');
    });
  };

  const handleStartGame = () => {
    emit('lobby:start', (response) => {
      if (response.success && response.gameState) {
        acceptGameState(response.gameState);
        setStatus('playing');
      } else if (!response.success) {
        toast('Could not start: ' + response.message, 'error');
      }
    });
  };

  const handleLeaveLobby = () => {
    emit('lobby:leave', (response) => {
      if (response.success) {
        clearSession();
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
          {players.map((player) => (
            <div key={player.id} className={`player-avatar-wrap${player.connected === false ? ' avatar-offline' : ''}`}>
              {player.id === hostPlayerId && <span className="host-crown">👑</span>}
              {isHost && player.isBot && (
                <button className="bot-remove" onClick={() => handleRemoveBot(player.id)} title={`Remove ${player.name}`} aria-label={`Remove ${player.name}`}>×</button>
              )}
              <div
                className={`player-avatar${player.isBot ? ' player-avatar-bot' : ''}`}
                style={{ backgroundColor: getAvatarColor(player.name) }}
              >
                {player.isBot ? '🤖' : getInitials(player.name)}
              </div>
              <span className="avatar-name">
                {player.name}
                {player.id === playerId && ' (You)'}
                {player.connected === false && ' ⚡'}
              </span>
            </div>
          ))}
          {Array.from({ length: 4 - players.length }).map((_, i) => (
            <div key={`empty-${i}`} className="player-avatar-wrap">
              {isHost && i === 0 ? (
                <>
                  <button className="player-avatar player-avatar-empty add-bot-slot" onClick={handleAddBot} title="Add a bot">🤖</button>
                  <span className="avatar-name">Add bot</span>
                </>
              ) : (
                <>
                  <div className="player-avatar player-avatar-empty">+</div>
                  <span className="avatar-name">Waiting...</span>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="lobby-status">
        {players.length < 2 && (
          <p className="waiting-text">
            Need at least 2 players to start{isHost ? ' — share the code or add a bot' : ''}
          </p>
        )}
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
