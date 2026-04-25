import { useEffect, useRef } from 'react';
import useGame from '../../hooks/useGame';

export default function PlayHistory() {
  const { history } = useGame();
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history.length]);

  if (history.length === 0) return null;

  return (
    <div className="play-history">
      <h4>Play History</h4>
      <div className="history-list">
        {history.map((entry, i) => (
          <div key={i} className={`history-entry ${i % 2 === 0 ? 'even' : 'odd'}`}>
            <span className="history-player">{entry.playerName}</span>
            <span className="history-claim">{entry.claim}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
