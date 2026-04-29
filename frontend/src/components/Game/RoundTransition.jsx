import { useEffect } from 'react';
import useGame from '../../hooks/useGame';

export default function RoundTransition() {
  const { roundTransition, clearRoundTransition } = useGame();

  useEffect(() => {
    if (!roundTransition) return;
    const t = setTimeout(clearRoundTransition, 2000);
    return () => clearTimeout(t);
  }, [roundTransition]);

  if (!roundTransition) return null;

  const { roundNumber, lastResult } = roundTransition;

  let summary = null;
  if (lastResult) {
    if (lastResult.noLiar) {
      summary = 'No liar called — everyone +1';
    } else if (lastResult.isLiarCorrect) {
      summary = `${lastResult.accusedName} was caught bluffing`;
    } else if (lastResult.isLiarCorrect === false) {
      summary = `${lastResult.accusedName} was truthful — ${lastResult.callerName} loses a point`;
    }
  }

  return (
    <div className="round-transition-overlay" onClick={clearRoundTransition}>
      <div className="round-transition-card">
        <h2>Round {roundNumber}</h2>
        {summary && <p className="rt-summary">{summary}</p>}
        <p className="rt-hint">Tap to continue</p>
      </div>
    </div>
  );
}
