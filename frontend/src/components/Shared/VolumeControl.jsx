import { useState, useRef, useEffect } from 'react';
import useGame from '../../hooks/useGame';

export default function VolumeControl() {
  const { soundEnabled, volume, toggleSound, setVolume } = useGame();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [open]);

  const icon = !soundEnabled ? '🔇' : volume < 0.33 ? '🔈' : volume < 0.67 ? '🔉' : '🔊';

  return (
    <div className="volume-control" ref={ref}>
      <button
        className="sound-toggle"
        onClick={() => setOpen(o => !o)}
        title="Volume settings"
      >
        {icon}
      </button>

      {open && (
        <div className="volume-popover">
          <label className="volume-mute-row">
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={toggleSound}
            />
            Sound enabled
          </label>
          <div className="volume-slider-row">
            <span>🔇</span>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(volume * 100)}
              disabled={!soundEnabled}
              onChange={(e) => setVolume(Number(e.target.value) / 100)}
              className="volume-slider"
            />
            <span>🔊</span>
          </div>
          <span className="volume-pct">{Math.round(volume * 100)}%</span>
        </div>
      )}
    </div>
  );
}
