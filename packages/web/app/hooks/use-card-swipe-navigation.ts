'use client';

import { useState, useCallback, useRef } from 'react';
import { useSwipeable } from 'react-swipeable';

const EXIT_DURATION = 300; // ms for slide-off animation
const SNAP_BACK_DURATION = 200; // ms for snap-back animation

export interface UseCardSwipeNavigationOptions {
  onSwipeNext: () => void;
  onSwipePrevious: () => void;
  canSwipeNext: boolean;
  canSwipePrevious: boolean;
  threshold?: number;
}

export interface UseCardSwipeNavigationReturn {
  swipeHandlers: ReturnType<typeof useSwipeable>;
  swipeOffset: number;
  isAnimating: boolean;
  animationDirection: 'left' | 'right' | null;
  resetSwipe: () => void;
}

export function useCardSwipeNavigation({
  onSwipeNext,
  onSwipePrevious,
  canSwipeNext,
  canSwipePrevious,
  threshold = 80,
}: UseCardSwipeNavigationOptions): UseCardSwipeNavigationReturn {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationDirection, setAnimationDirection] = useState<'left' | 'right' | null>(null);
  const isHorizontalSwipeRef = useRef<boolean | null>(null);
  const animatingRef = useRef(false);

  const resetSwipe = useCallback(() => {
    setSwipeOffset(0);
    setIsAnimating(false);
    setAnimationDirection(null);
    isHorizontalSwipeRef.current = null;
    animatingRef.current = false;
  }, []);

  const triggerSwipeComplete = useCallback(
    (direction: 'left' | 'right') => {
      if (animatingRef.current) return;
      animatingRef.current = true;

      // Determine the exit offset (card slides off-screen)
      const exitOffset = direction === 'left' ? -window.innerWidth : window.innerWidth;

      setAnimationDirection(direction);
      setIsAnimating(true);
      setSwipeOffset(exitOffset);

      // Call the navigation callback
      if (direction === 'left') {
        onSwipeNext();
      } else {
        onSwipePrevious();
      }

      // After exit animation, reset everything
      setTimeout(() => {
        resetSwipe();
      }, EXIT_DURATION);
    },
    [onSwipeNext, onSwipePrevious, resetSwipe],
  );

  const swipeHandlers = useSwipeable({
    onSwiping: (eventData) => {
      if (animatingRef.current) return;

      const { deltaX, deltaY } = eventData;

      // On first movement, determine swipe direction
      if (isHorizontalSwipeRef.current === null) {
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);
        if (absX > 10 || absY > 10) {
          isHorizontalSwipeRef.current = absX > absY;
        }
        return;
      }

      // If vertical swipe, don't interfere
      if (!isHorizontalSwipeRef.current) return;

      // Constrain swipe if we can't go in that direction
      let constrainedOffset = deltaX;
      if (deltaX < 0 && !canSwipeNext) constrainedOffset = 0;
      if (deltaX > 0 && !canSwipePrevious) constrainedOffset = 0;

      setSwipeOffset(constrainedOffset);
    },
    onSwipedLeft: (eventData) => {
      isHorizontalSwipeRef.current = null;
      if (animatingRef.current) return;

      if (canSwipeNext && Math.abs(eventData.deltaX) >= threshold) {
        triggerSwipeComplete('left');
      } else {
        setSwipeOffset(0);
      }
    },
    onSwipedRight: (eventData) => {
      isHorizontalSwipeRef.current = null;
      if (animatingRef.current) return;

      if (canSwipePrevious && Math.abs(eventData.deltaX) >= threshold) {
        triggerSwipeComplete('right');
      } else {
        setSwipeOffset(0);
      }
    },
    onTouchEndOrOnMouseUp: () => {
      isHorizontalSwipeRef.current = null;
      if (!animatingRef.current && Math.abs(swipeOffset) < threshold) {
        setSwipeOffset(0);
      }
    },
    trackMouse: false,
    trackTouch: true,
    preventScrollOnSwipe: false,
  });

  return {
    swipeHandlers,
    swipeOffset,
    isAnimating,
    animationDirection,
    resetSwipe,
  };
}

export { EXIT_DURATION, SNAP_BACK_DURATION };
