import { useEffect } from 'react';
import useGame from '../../hooks/useGame';
import useKeyboardShortcuts from '../../hooks/useKeyboardShortcuts';
import useTouchGestures from '../../hooks/useTouchGestures';
import Header from '../Shared/Header';
import NetworkStatus from '../Shared/NetworkStatus';
import DisconnectBanner from './DisconnectBanner';
import PokerTable from './PokerTable';

export default function GameBoard() {
  const {
    gameCode,
    on,
    off,
    acceptGameState,
    setMyHand,
    setWinner,
    setStatus,
    clearSelection,
    addDisconnectedPlayer,
    removeDisconnectedPlayer,
    setTableDisplay,
    clearTableDisplay,
    setRoundTransition,
  } = useGame();

  useKeyboardShortcuts();
  useTouchGestures();

  useEffect(() => {
    if (!gameCode) return;

    const handleGameState = (data) => acceptGameState(data);
    const handleHand = (hand) => { setMyHand(hand); clearSelection(); };
    const handleGameWon = (data) => { setWinner(data); setStatus('won'); };
    const handleLiarRevealed = (data) => {
      clearSelection();
      setTableDisplay({
        revealed: true,
        noLiar: false,
        cards: data.cardsPlayed,
        accusedName: data.accusedName,
        callerName: data.callerName,
        isLiarCorrect: data.isLiarCorrect,
        scoreDeltas: data.scoreDeltas,
        scores: data.scores,
      });
    };
    const handleRoundNoLiar = (data) => {
      setTableDisplay({
        revealed: true,
        noLiar: true,
        cards: null,
        accusedName: null,
        callerName: null,
        isLiarCorrect: null,
        scoreDeltas: data.scoreDeltas,
        scores: data.scores,
      });
    };
    const handlePlayerDisconnected = (data) => addDisconnectedPlayer(data);
    const handlePlayerReconnected = (data) => removeDisconnectedPlayer(data.playerId);
    const handlePlayerLeft = (data) => removeDisconnectedPlayer(data.playerId);
    const handleTimeUp = (data) => {
      if (data.tiebreak) {
        acceptGameState(data.gameState);
        setRoundTransition({ roundNumber: data.gameState.roundNumber, timeUp: true });
      }
    };

    on('game:state', handleGameState);
    on('game:hand', handleHand);
    on('game:won', handleGameWon);
    on('game:liar:revealed', handleLiarRevealed);
    on('game:round:noLiar', handleRoundNoLiar);
    on('player:disconnected', handlePlayerDisconnected);
    on('player:reconnected', handlePlayerReconnected);
    on('player:left', handlePlayerLeft);
    on('game:timeUp', handleTimeUp);

    return () => {
      off('game:state', handleGameState);
      off('game:hand', handleHand);
      off('game:won', handleGameWon);
      off('game:liar:revealed', handleLiarRevealed);
      off('game:round:noLiar', handleRoundNoLiar);
      off('player:disconnected', handlePlayerDisconnected);
      off('player:reconnected', handlePlayerReconnected);
      off('player:left', handlePlayerLeft);
      off('game:timeUp', handleTimeUp);
    };
  }, [gameCode, acceptGameState, setMyHand, setWinner, setStatus, clearSelection, addDisconnectedPlayer, removeDisconnectedPlayer, setTableDisplay, clearTableDisplay, on, off]);

  return (
    <div className="game-board">
      <NetworkStatus />
      <DisconnectBanner />
      <Header />
      <PokerTable />
    </div>
  );
}
