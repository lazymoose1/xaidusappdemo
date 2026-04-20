/**
 * Haptic feedback utilities for mobile devices
 * Provides tactile feedback for user interactions
 */

export type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

/**
 * Trigger haptic feedback on supported devices
 * @param style - The intensity/type of haptic feedback
 */
export const triggerHaptic = (style: HapticStyle = 'light') => {
  // Check if device supports haptic feedback
  if (!('vibrate' in navigator)) {
    return;
  }

  // Map styles to vibration patterns (in milliseconds)
  const patterns: Record<HapticStyle, number | number[]> = {
    light: 10,
    medium: 20,
    heavy: 40,
    success: [10, 50, 10],
    warning: [20, 100, 20],
    error: [30, 100, 30, 100, 30],
  };

  try {
    navigator.vibrate(patterns[style]);
  } catch (error) {
    console.warn('Haptic feedback failed:', error);
  }
};

/**
 * Cancel any ongoing haptic feedback
 */
export const cancelHaptic = () => {
  if ('vibrate' in navigator) {
    navigator.vibrate(0);
  }
};

/**
 * Check if device supports haptic feedback
 */
export const supportsHaptic = (): boolean => {
  return 'vibrate' in navigator;
};
