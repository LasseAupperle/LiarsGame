/**
 * GamePage.jsx - Main game container
 */

import GameBoard from '../components/Game/GameBoard';
import useGame from '../hooks/useGame';

export default function GamePage() {
  const { gameCode } = useGame();

  if (!gameCode) {
    return <div>No game selected</div>;
  }

  return (
    <div className="game-page">
      <GameBoard />
    </div>
  );
}
