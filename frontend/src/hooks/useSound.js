/**
 * useSound.js - Hook for playing sound effects
 */

import { useCallback } from 'react';
import useUIStore from '../store/uiStore';

const sounds = {
  'card-place': '/assets/sounds/card-place.mp3',
  'card-flip': '/assets/sounds/card-flip.mp3',
  'liar-call': '/assets/sounds/liar-call.mp3',
  'points-gain': '/assets/sounds/points-gain.mp3',
  'points-lose': '/assets/sounds/points-lose.mp3',
  'turn-change': '/assets/sounds/turn-change.mp3',
  'game-win': '/assets/sounds/game-win.mp3'
};

const useSound = () => {
  const soundEnabled = useUIStore((state) => state.soundEnabled);

  const playSound = useCallback(
    (soundName) => {
      if (!soundEnabled || !sounds[soundName]) {
        return;
      }

      try {
        const audio = new Audio(sounds[soundName]);
        audio.play().catch((err) => console.error('Error playing sound:', err));
      } catch (error) {
        console.error('Error loading sound:', error);
      }
    },
    [soundEnabled]
  );

  return { playSound };
};

export default useSound;
