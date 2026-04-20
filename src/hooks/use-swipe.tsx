import { useEffect, useRef, RefObject } from 'react';

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

interface SwipeOptions {
  minSwipeDistance?: number;
  maxSwipeTime?: number;
  preventScroll?: boolean;
}

/**
 * Hook for handling swipe gestures on touch devices
 * @param handlers - Object containing swipe direction callbacks
 * @param options - Configuration options for swipe detection
 * @returns Ref to attach to the element you want to detect swipes on
 */
export function useSwipe<T extends HTMLElement>(
  handlers: SwipeHandlers,
  options: SwipeOptions = {}
): RefObject<T> {
  const {
    minSwipeDistance = 50,
    maxSwipeTime = 500,
    preventScroll = false,
  } = options;

  const elementRef = useRef<T>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (preventScroll) {
        e.preventDefault();
      }
      
      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      const deltaTime = Date.now() - touchStartRef.current.time;

      // Check if swipe was fast enough
      if (deltaTime > maxSwipeTime) {
        touchStartRef.current = null;
        return;
      }

      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      // Determine swipe direction based on larger delta
      if (absDeltaX > absDeltaY) {
        // Horizontal swipe
        if (absDeltaX >= minSwipeDistance) {
          if (deltaX > 0) {
            handlers.onSwipeRight?.();
          } else {
            handlers.onSwipeLeft?.();
          }
        }
      } else {
        // Vertical swipe
        if (absDeltaY >= minSwipeDistance) {
          if (deltaY > 0) {
            handlers.onSwipeDown?.();
          } else {
            handlers.onSwipeUp?.();
          }
        }
      }

      touchStartRef.current = null;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (preventScroll && touchStartRef.current) {
        e.preventDefault();
      }
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: !preventScroll });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: !preventScroll });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchmove', handleTouchMove);
    };
  }, [handlers, minSwipeDistance, maxSwipeTime, preventScroll]);

  return elementRef;
}
