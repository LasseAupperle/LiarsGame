import useGame from './hooks/useGame';
import ErrorBoundary from './components/ErrorBoundary';
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';
import GameWon from './components/Game/GameWon';
import Toasts from './components/Shared/Toasts';
import useGlobalGameEvents from './hooks/useGlobalGameEvents';
import './AppStyles.css';
import './features.css';

function App() {
  const { status, connected, winner, gameCode } = useGame();
  useGlobalGameEvents();

  // Only block the screen before we're in a lobby/game. Mid-game, a dropped
  // connection shows the NetworkStatus banner and the game stays mounted while
  // the socket reconnects and rejoins (SPEC §2.1).
  if (!connected && !gameCode) {
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
        <Toasts />
        {status === 'won' && winner && (
          <GameWon winner={winner} />
        )}
      </>
    </ErrorBoundary>
  );
}

export default App;
