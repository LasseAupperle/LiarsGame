/**
 * GameBoard.jsx - Main game view
 */

import { useEffect } from 'react';
import useGame from '../../hooks/useGame';
import useKeyboardShortcuts from '../../hooks/useKeyboardShortcuts';
import useTouchGestures from '../../hooks/useTouchGestures';
import Header from '../Shared/Header';
import ScoreBoard from '../Shared/ScoreBoard';
import NetworkStatus from '../Shared/NetworkStatus';
import CardDisplay from './CardDisplay';
import PlayerPanel from './PlayerPanel';
import PlayerHand from './PlayerHand';
import ActionButtons from './ActionButtons';
import CardVisibilityToggle from './CardVisibilityToggle';

export default function GameBoard() {
  const {
    gameCode,
    playerId,
    players,
    currentPlayerId,
    history,
    on,
    off,
    setCurrentPlayerId,
    clearSelection,
    setStatus
  } = useGame();

  // Enable keyboard shortcuts on PC
  useKeyboardShortcuts();

  // Enable touch gestures on mobile
  useTouchGestures();

  const yourHand = players.find(p => p.id === playerId)?.hand || [];

  useEffect(() => {
    if (!gameCode) return;

    const handleGameState = (data) => {
      setCurrentPlayerId(data.currentPlayerId);
    };

    const handleGameWon = (data) => {
      setStatus('won');
      alert(`${data.winnerName} won with ${data.finalScore} points!`);
    };

    const handleGameLiarRevealed = () => {
      clearSelection();
    };

    on('game:state', handleGameState);
    on('game:won', handleGameWon);
    on('game:liar:revealed', handleGameLiarRevealed);

    return () => {
      off('game:state', handleGameState);
      off('game:won', handleGameWon);
      off('game:liar:revealed', handleGameLiarRevealed);
    };
  }, [gameCode, setCurrentPlayerId, setStatus, clearSelection, on, off]);

  return (
    <div className="game-board">
      <NetworkStatus />
      <Header />

      <div className="main-content">
        <div className="left-sidebar">
          <ScoreBoard />
        </div>

        <div className="center-board">
          <CardDisplay />
          <PlayerPanel />
        </div>

        <div className="right-sidebar">
          <div className="round-info">
            <p>Players: {players.length}/4</p>
          </div>
        </div>
      </div>

      <div className="bottom-panel">
        <div className="card-controls">
          <CardVisibilityToggle />
        </div>
        <PlayerHand hand={yourHand} />
        <ActionButtons />
      </div>
    </div>
  );
}
