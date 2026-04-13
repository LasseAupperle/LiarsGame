/**
 * useHapticFeedback.js - Haptic feedback for mobile devices
 */

const useHapticFeedback = () => {
  const triggerVibration = (pattern = 50) => {
    if (navigator.vibrate) {
      if (Array.isArray(pattern)) {
        navigator.vibrate(pattern);
      } else {
        navigator.vibrate(pattern);
      }
    }
  };

  const tap = () => triggerVibration(50); // 50ms tap
  const doubleTap = () => triggerVibration([30, 30, 30]); // Double tap pattern
  const longPress = () => triggerVibration(100); // 100ms long press
  const success = () => triggerVibration([20, 20, 20]); // Success pattern
  const error = () => triggerVibration([100, 50, 100]); // Error pattern

  return {
    tap,
    doubleTap,
    longPress,
    success,
    error,
    triggerVibration
  };
};

export default useHapticFeedback;
