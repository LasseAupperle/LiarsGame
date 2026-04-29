import { useState, useEffect } from 'react';
import useGame from '../../hooks/useGame';

export default function GameTimer() {
  const { gameEndTime } = useGame();
  const [remaining, setRemaining] = useState(null);

  useEffect(() => {
    if (!gameEndTime) { setRemaining(null); return; }

    const tick = () => {
      const diff = Math.max(0, gameEndTime - Date.now());
      setRemaining(diff);
      if (diff === 0) clearInterval(id);
    };

    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [gameEndTime]);

  if (remaining === null) return null;

  const totalSec = Math.ceil(remaining / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  const display = `${mins}:${String(secs).padStart(2, '0')}`;
  const urgent = remaining < 60000;

  return (
    <span className={`game-timer ${urgent ? 'urgent' : ''}`}>
      ⏱ {display}
    </span>
  );
}
