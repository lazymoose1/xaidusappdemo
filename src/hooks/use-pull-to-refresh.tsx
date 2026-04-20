import { useEffect, useRef, useState } from 'react';

interface PullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  resistance?: number;
  enabled?: boolean;
}

/**
 * Hook for implementing pull-to-refresh on mobile
 * @param options - Configuration options
 * @returns Object with pullDistance state and ref to attach to container
 */
export function usePullToRefresh<T extends HTMLElement>({
  onRefresh,
  threshold = 80,
  resistance = 2.5,
  enabled = true,
}: PullToRefreshOptions) {
  const elementRef = useRef<T>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartRef = useRef<number | null>(null);
  const scrollStartRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;
    
    const element = elementRef.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Only trigger if at top of page
      if (window.scrollY === 0) {
        scrollStartRef.current = window.scrollY;
        touchStartRef.current = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (touchStartRef.current === null || isRefreshing) return;
      if (window.scrollY > 0) return;

      const touchY = e.touches[0].clientY;
      const delta = touchY - touchStartRef.current;

      if (delta > 0) {
        // Apply resistance to make it feel natural
        const distance = Math.min(delta / resistance, threshold * 1.5);
        setPullDistance(distance);
        
        // Prevent default scrolling when pulling down
        if (distance > 10) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = async () => {
      if (pullDistance >= threshold && !isRefreshing) {
        setIsRefreshing(true);
        
        // Trigger haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate(10);
        }
        
        try {
          await onRefresh();
        } catch (error) {
          console.error('Refresh failed:', error);
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
        }
      } else {
        setPullDistance(0);
      }
      
      touchStartRef.current = null;
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onRefresh, threshold, resistance, pullDistance, isRefreshing, enabled]);

  return {
    elementRef,
    pullDistance,
    isRefreshing,
  };
}
