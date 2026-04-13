/**
 * useTouchGestures.js - Touch gestures for mobile
 * Swipe left/right: Navigate players
 * Tap: Select card
 * Double tap: Confirm play
 */

import { useEffect, useRef } from 'react';

const useTouchGestures = () => {
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const touchStartTime = useRef(0);

  useEffect(() => {
    const handleTouchStart = (e) => {
      touchStartX.current = e.changedTouches[0].screenX;
      touchStartTime.current = Date.now();
    };

    const handleTouchEnd = (e) => {
      touchEndX.current = e.changedTouches[0].screenX;
      const touchDuration = Date.now() - touchStartTime.current;
      const swipeThreshold = 50;

      // Detect swipe
      const distance = touchStartX.current - touchEndX.current;

      if (Math.abs(distance) > swipeThreshold && touchDuration < 300) {
        if (distance > 0) {
          // Swiped left
          document.dispatchEvent(new CustomEvent('swipe-left'));
        } else {
          // Swiped right
          document.dispatchEvent(new CustomEvent('swipe-right'));
        }
      }
    };

    window.addEventListener('touchstart', handleTouchStart, false);
    window.addEventListener('touchend', handleTouchEnd, false);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  return {
    onSwipeLeft: (callback) => {
      document.addEventListener('swipe-left', callback);
      return () => document.removeEventListener('swipe-left', callback);
    },
    onSwipeRight: (callback) => {
      document.addEventListener('swipe-right', callback);
      return () => document.removeEventListener('swipe-right', callback);
    }
  };
};

export default useTouchGestures;
