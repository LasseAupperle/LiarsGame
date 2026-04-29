/**
 * LobbyCreate.jsx - Form to create a new game lobby
 */

import { useState } from 'react';
import useGame from '../../hooks/useGame';

export default function LobbyCreate({ onBack }) {
  const [playerName, setPlayerName] = useState('');
  const [mode, setMode] = useState('standard'); // standard | short | timed
  const [timedMinutes, setTimedMinutes] = useState(5);
  const [loading, setLoading] = useState(false);
  const { emit, setPlayerId, setPlayerName: setGamePlayerName, setGameCode, setStatus, setPlayers, saveSession, setGameSettings } = useGame();

  const handleCreateLobby = (e) => {
    e.preventDefault();
    if (!playerName.trim()) return;

    const settings = { mode, timedMinutes: mode === 'timed' ? Number(timedMinutes) : null };

    setLoading(true);
    emit('lobby:create', playerName, settings, (response) => {
      setLoading(false);
      if (response.success) {
        setGamePlayerName(playerName);
        setPlayerId(response.playerId);
        setPlayers(response.players);
        setGameCode(response.lobbyCode);
        setGameSettings(settings);
        setStatus('lobby');
        saveSession();
      } else {
        alert('Error creating lobby: ' + response.message);
      }
    });
  };

  return (
    <div className="lobby-create">
      <button className="btn-back" onClick={onBack}>← Back</button>
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

        <div className="mode-selector">
          <label className={`mode-option ${mode === 'standard' ? 'selected' : ''}`}>
            <input type="radio" name="mode" value="standard" checked={mode === 'standard'} onChange={() => setMode('standard')} />
            <span className="mode-label">Standard</span>
            <span className="mode-desc">First to 20 pts</span>
          </label>
          <label className={`mode-option ${mode === 'short' ? 'selected' : ''}`}>
            <input type="radio" name="mode" value="short" checked={mode === 'short'} onChange={() => setMode('short')} />
            <span className="mode-label">Short</span>
            <span className="mode-desc">First to 10 pts</span>
          </label>
          <label className={`mode-option ${mode === 'timed' ? 'selected' : ''}`}>
            <input type="radio" name="mode" value="timed" checked={mode === 'timed'} onChange={() => setMode('timed')} />
            <span className="mode-label">Timed</span>
            <span className="mode-desc">Most pts wins</span>
          </label>
        </div>

        {mode === 'timed' && (
          <div className="timed-input">
            <label>Duration (minutes)</label>
            <input
              type="number"
              min="1"
              max="60"
              value={timedMinutes}
              onChange={(e) => setTimedMinutes(e.target.value)}
              required
            />
          </div>
        )}

        <button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Lobby'}
        </button>
      </form>
    </div>
  );
}
