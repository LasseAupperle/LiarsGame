import { useEffect, useState } from 'react';
import useGame from './hooks/useGame';
import ErrorBoundary from './components/ErrorBoundary';
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';
import './AppStyles.css';

function App() {
  const { status, connected, setPlayerId, setPlayerName } = useGame();

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
        {status === 'won' && (
          <div className="lobby-page">
            <div className="lobby-container">
              <h1 className="page-title">Game Over!</h1>
              <button className="btn-primary" onClick={() => window.location.href = '/'}>
                Play Again
              </button>
            </div>
          </div>
        )}
      </>
    </ErrorBoundary>
  );
}

export default App;
