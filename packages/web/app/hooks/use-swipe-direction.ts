'use client';

import { useRef, useCallback } from 'react';

const DIRECTION_THRESHOLD = 10;

/**
 * Hook to determine whether an in-progress swipe is horizontal or vertical.
 * Call `detect(deltaX, deltaY)` on each swiping event:
 *  - Returns `null` until movement exceeds the threshold
 *  - Returns `true` if horizontal, `false` if vertical
 *  - Once locked, the direction is sticky until `reset()` is called
 */
export function useSwipeDirection() {
  const isHorizontalRef = useRef<boolean | null>(null);

  const detect = useCallback((deltaX: number, deltaY: number): boolean | null => {
    if (isHorizontalRef.current === null) {
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      if (absX > DIRECTION_THRESHOLD || absY > DIRECTION_THRESHOLD) {
        isHorizontalRef.current = absX > absY;
      }
    }
    return isHorizontalRef.current;
  }, []);

  const reset = useCallback(() => {
    isHorizontalRef.current = null;
  }, []);

  return { detect, reset, isHorizontalRef };
}
