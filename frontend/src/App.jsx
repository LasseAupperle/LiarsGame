import useGame from './hooks/useGame';
import ErrorBoundary from './components/ErrorBoundary';
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';
import GameWon from './components/Game/GameWon';
import './AppStyles.css';

function App() {
  const { status, connected, winner } = useGame();

  if (!connected) {
    return (
      <div className="lobby-page">
        <div className="lobby-container">
          <h1 className="page-title">Connecting...</h1>
          <p className="subtitle">Establishing connection to game server</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <>
        {status === 'lobby' && <LobbyPage />}
        {(status === 'playing' || status === 'spectating') && <GamePage />}
        {status === 'won' && winner && (
          <GameWon
            winnerId={winner.winnerId}
            winnerName={winner.winnerName}
            finalScore={winner.finalScore}
          />
        )}
      </>
    </ErrorBoundary>
  );
}

export default App;
