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
    players,
    myHand,
    on,
    off,
    acceptGameState,
    setMyHand,
    setWinner,
    setStatus,
    clearSelection
  } = useGame();

  useKeyboardShortcuts();
  useTouchGestures();

  useEffect(() => {
    if (!gameCode) return;

    const handleGameState = (data) => {
      acceptGameState(data);
    };

    const handleHand = (hand) => {
      setMyHand(hand);
    };

    const handleGameWon = (data) => {
      setWinner(data);
      setStatus('won');
    };

    const handleLiarRevealed = () => {
      clearSelection();
    };

    on('game:state', handleGameState);
    on('game:hand', handleHand);
    on('game:won', handleGameWon);
    on('game:liar:revealed', handleLiarRevealed);

    return () => {
      off('game:state', handleGameState);
      off('game:hand', handleHand);
      off('game:won', handleGameWon);
      off('game:liar:revealed', handleLiarRevealed);
    };
  }, [gameCode, acceptGameState, setMyHand, setWinner, setStatus, clearSelection, on, off]);

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
        <PlayerHand hand={myHand} />
        <ActionButtons />
      </div>
    </div>
  );
}
