/**
 * GameWon.jsx - Result screen with Rematch / Leave (SPEC §2.3)
 */

import { useState } from 'react';
import useGame from '../../hooks/useGame';
import useGameStore from '../../store/gameStore';
import useUIStore, { toast } from '../../store/uiStore';

export default function GameWon({ winner }) {
  const { players, playerId, emit } = useGame();
  const [busy, setBusy] = useState(false);
  const { winnerId, winnerName, finalScore, rematch } = winner;
  const scores = winner.finalScores
    ?? [...players].sort((a, b) => b.mainScore - a.mainScore);

  const goToMenu = () => {
    useGameStore.getState().reset();
    useUIStore.getState().resetGameUI();
  };

  const handleLeave = () => {
    emit('lobby:leave', () => {});
    goToMenu();
  };

  // Back to the same lobby: fetch its fresh state via rejoin
  const handleRematch = () => {
    const { gameCode, sessionToken } = useGameStore.getState();
    setBusy(true);
    emit('game:rejoin', gameCode, sessionToken, (res) => {
      setBusy(false);
      const g = useGameStore.getState();
      if (res?.success && res.phase === 'lobby') {
        g.resetGameState();
        useUIStore.getState().resetGameUI();
        g.setPlayers(res.players || []);
        g.setHostId(res.host || null);
        if (res.settings) g.setGameSettings(res.settings);
        g.saveSession();
        g.setStatus('lobby');
      } else if (res?.success && res.phase === 'game') {
        // Host already started the rematch
        g.resetGameState();
        useUIStore.getState().resetGameUI();
        g.acceptGameState(res.gameState);
        g.setMyHand(res.hand || []);
        g.setStatus('playing');
      } else {
        toast('That lobby has closed', 'error');
        goToMenu();
      }
    });
  };

  return (
    <div className="game-won-overlay">
      <div className="game-won-modal">
        <h1 className="winner-title">🎉 Game Over! 🎉</h1>

        <div className="winner-info">
          <h2 className="winner-name">{winnerName}</h2>
          <p className="winner-score">{finalScore} points</p>
          {winnerId === playerId && <p className="you-won">You won!</p>}
        </div>

        <div className="final-scores">
          <h3>Final Scores</h3>
          <ul>
            {scores.map((player) => (
              <li key={player.id} className={player.id === playerId ? 'you' : ''}>
                <span className="name">{player.name}</span>
                <span className="score">{player.mainScore} pts</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="game-won-actions">
          {rematch && (
            <button className="btn-primary play-again-btn" onClick={handleRematch} disabled={busy}>
              Rematch
            </button>
          )}
          <button className={rematch ? 'btn-secondary' : 'btn-primary play-again-btn'} onClick={handleLeave}>
            {rematch ? 'Leave' : 'Main menu'}
          </button>
        </div>
        {rematch && <p className="rematch-hint">Everyone still at the table is in the next game unless they leave.</p>}
      </div>
    </div>
  );
}
