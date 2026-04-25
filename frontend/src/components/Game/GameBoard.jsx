import { useEffect } from 'react';
import useGame from '../../hooks/useGame';
import useKeyboardShortcuts from '../../hooks/useKeyboardShortcuts';
import useTouchGestures from '../../hooks/useTouchGestures';
import Header from '../Shared/Header';
import NetworkStatus from '../Shared/NetworkStatus';
import CardDisplay from './CardDisplay';
import PlayHistory from './PlayHistory';
import PlayerPanel from './PlayerPanel';
import PlayerHand from './PlayerHand';
import ActionButtons from './ActionButtons';
import CardVisibilityToggle from './CardVisibilityToggle';
import DisconnectBanner from './DisconnectBanner';

export default function GameBoard() {
  const {
    gameCode,
    myHand,
    on,
    off,
    acceptGameState,
    setMyHand,
    setWinner,
    setStatus,
    clearSelection,
    addDisconnectedPlayer,
    removeDisconnectedPlayer
  } = useGame();

  useKeyboardShortcuts();
  useTouchGestures();

  useEffect(() => {
    if (!gameCode) return;

    const handleGameState = (data) => acceptGameState(data);
    const handleHand = (hand) => setMyHand(hand);
    const handleGameWon = (data) => { setWinner(data); setStatus('won'); };
    const handleLiarRevealed = () => clearSelection();
    const handlePlayerDisconnected = (data) => addDisconnectedPlayer(data);
    const handlePlayerReconnected = (data) => removeDisconnectedPlayer(data.playerId);
    const handlePlayerLeft = (data) => removeDisconnectedPlayer(data.playerId);

    on('game:state', handleGameState);
    on('game:hand', handleHand);
    on('game:won', handleGameWon);
    on('game:liar:revealed', handleLiarRevealed);
    on('player:disconnected', handlePlayerDisconnected);
    on('player:reconnected', handlePlayerReconnected);
    on('player:left', handlePlayerLeft);

    return () => {
      off('game:state', handleGameState);
      off('game:hand', handleHand);
      off('game:won', handleGameWon);
      off('game:liar:revealed', handleLiarRevealed);
      off('player:disconnected', handlePlayerDisconnected);
      off('player:reconnected', handlePlayerReconnected);
      off('player:left', handlePlayerLeft);
    };
  }, [gameCode, acceptGameState, setMyHand, setWinner, setStatus, clearSelection, addDisconnectedPlayer, removeDisconnectedPlayer, on, off]);

  return (
    <div className="game-board">
      <NetworkStatus />
      <DisconnectBanner />
      <Header />

      <div className="game-content">
        <CardDisplay />
        <PlayHistory />
        <PlayerPanel />
      </div>

      <div className="bottom-panel">
        <CardVisibilityToggle />
        <PlayerHand hand={myHand} />
        <ActionButtons />
      </div>
    </div>
  );
}
