'use client';

import { useState, useCallback, useRef } from 'react';
import { useSwipeable } from 'react-swipeable';

const EXIT_DURATION = 300; // ms for slide-off animation
const SNAP_BACK_DURATION = 200; // ms for snap-back animation
const CLIP_EXIT_DURATION = 100; // ms before starting enter — text leaves narrow clip area faster than full EXIT_DURATION

export interface UseCardSwipeNavigationOptions {
  onSwipeNext: () => void;
  onSwipePrevious: () => void;
  canSwipeNext: boolean;
  canSwipePrevious: boolean;
  threshold?: number;
  delayNavigation?: boolean;
}

export interface UseCardSwipeNavigationReturn {
  swipeHandlers: ReturnType<typeof useSwipeable>;
  swipeOffset: number;
  isAnimating: boolean;
  animationDirection: 'left' | 'right' | null;
  enterDirection: 'from-left' | 'from-right' | null;
  clearEnterAnimation: () => void;
  resetSwipe: () => void;
}

export function useCardSwipeNavigation({
  onSwipeNext,
  onSwipePrevious,
  canSwipeNext,
  canSwipePrevious,
  threshold = 80,
  delayNavigation = false,
}: UseCardSwipeNavigationOptions): UseCardSwipeNavigationReturn {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationDirection, setAnimationDirection] = useState<'left' | 'right' | null>(null);
  const [enterDirection, setEnterDirection] = useState<'from-left' | 'from-right' | null>(null);
  const isHorizontalSwipeRef = useRef<boolean | null>(null);
  const animatingRef = useRef(false);

  const resetSwipe = useCallback(() => {
    setSwipeOffset(0);
    setIsAnimating(false);
    setAnimationDirection(null);
    isHorizontalSwipeRef.current = null;
    animatingRef.current = false;
  }, []);

  const clearEnterAnimation = useCallback(() => {
    setEnterDirection(null);
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

      if (!delayNavigation) {
        // Call the navigation callback immediately (existing behavior)
        if (direction === 'left') {
          onSwipeNext();
        } else {
          onSwipePrevious();
        }

        // After exit animation, reset everything
        setTimeout(() => {
          resetSwipe();
        }, EXIT_DURATION);
      } else {
        // Delay navigation until text exits the visible clip area, then trigger enter animation.
        // Uses CLIP_EXIT_DURATION (shorter than EXIT_DURATION) because the text leaves
        // the narrow clip container much faster than the full slide-off animation.
        setTimeout(() => {
          // Navigate to new climb data
          if (direction === 'left') {
            onSwipeNext();
          } else {
            onSwipePrevious();
          }

          // Reset exit state
          setSwipeOffset(0);
          setIsAnimating(false);
          setAnimationDirection(null);
          isHorizontalSwipeRef.current = null;
          // Set enter direction for thumbnail crossfade
          setEnterDirection(direction === 'left' ? 'from-right' : 'from-left');
          // Unblock swipes immediately — peek text provides visual continuity
          animatingRef.current = false;
        }, CLIP_EXIT_DURATION);
      }
    },
    [onSwipeNext, onSwipePrevious, resetSwipe, delayNavigation],
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
    enterDirection,
    clearEnterAnimation,
    resetSwipe,
  };
}

export { EXIT_DURATION, SNAP_BACK_DURATION };
