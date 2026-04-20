/**
 * useSound.js - Hook for playing sound effects
 */

import { useCallback } from 'react';
import useUIStore from '../store/uiStore';

const sounds = {
  'card-place': '/assets/sounds/card-place.wav',
  'card-flip': '/assets/sounds/card-flip.wav',
  'liar-call': '/assets/sounds/liar-call.wav',
  'points-gain': '/assets/sounds/points-gain.wav',
  'points-lose': '/assets/sounds/points-lose.wav',
  'turn-change': '/assets/sounds/turn-change.wav',
  'game-win': '/assets/sounds/game-win.wav'
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
