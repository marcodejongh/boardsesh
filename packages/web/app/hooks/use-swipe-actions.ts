'use client';

import { useRef, useCallback, useState } from 'react';
import { useSwipeable } from 'react-swipeable';
import { useSwipeDirection } from './use-swipe-direction';

// Threshold in pixels to trigger the swipe action
const DEFAULT_SWIPE_THRESHOLD = 100;
// Maximum swipe distance
const DEFAULT_MAX_SWIPE = 120;

export interface UseSwipeActionsOptions {
  /** Called when the user swipes left past the threshold */
  onSwipeLeft: () => void;
  /** Called when the user swipes right past the threshold */
  onSwipeRight: () => void;
  /** Pixel threshold to trigger action (default: 100) */
  swipeThreshold?: number;
  /** Maximum swipe distance in pixels (default: 120) */
  maxSwipe?: number;
  /** Whether swipe is disabled (e.g. in edit mode) */
  disabled?: boolean;
  /** Duration of the completion animation in ms (default: 200) */
  completionAnimationMs?: number;
}

export interface UseSwipeActionsReturn {
  /** Spread onto the swipeable container element */
  swipeHandlers: ReturnType<typeof useSwipeable>;
  /** Whether the swipe-off animation is in progress (item fading out) */
  isSwipeComplete: boolean;
  /** Ref for the swipeable content element (applies transform) */
  contentRef: React.RefCallback<HTMLElement>;
  /** Ref for the left action background (visible on swipe right) */
  leftActionRef: React.RefCallback<HTMLElement>;
  /** Ref for the right action background (visible on swipe left) */
  rightActionRef: React.RefCallback<HTMLElement>;
}

/**
 * Hook for swipe-to-action gestures on list items.
 *
 * Unlike useState-based approaches, this hook directly manipulates
 * DOM element styles during the gesture to avoid React re-renders
 * at 60fps. React state is only updated on gesture completion
 * (action triggered) or cancellation (snap back).
 */
export function useSwipeActions({
  onSwipeLeft,
  onSwipeRight,
  swipeThreshold = DEFAULT_SWIPE_THRESHOLD,
  maxSwipe = DEFAULT_MAX_SWIPE,
  disabled = false,
  completionAnimationMs = 200,
}: UseSwipeActionsOptions): UseSwipeActionsReturn {
  const [isSwipeComplete, setIsSwipeComplete] = useState(false);

  // DOM element refs (set via ref callbacks)
  const contentEl = useRef<HTMLElement | null>(null);
  const leftActionEl = useRef<HTMLElement | null>(null);
  const rightActionEl = useRef<HTMLElement | null>(null);

  // Gesture state (not React state -- no re-renders)
  const offsetRef = useRef(0);
  const { detect: detectDirection, reset: resetDirection, isHorizontalRef } = useSwipeDirection();

  const contentRef = useCallback((node: HTMLElement | null) => {
    contentEl.current = node;
  }, []);

  const leftActionRef = useCallback((node: HTMLElement | null) => {
    leftActionEl.current = node;
  }, []);

  const rightActionRef = useCallback((node: HTMLElement | null) => {
    rightActionEl.current = node;
  }, []);

  /** Apply the current offset to the DOM elements directly */
  const applyOffset = useCallback((offset: number) => {
    offsetRef.current = offset;

    if (contentEl.current) {
      contentEl.current.style.transform = `translateX(${offset}px)`;
      // Only apply transition when snapping back to zero
      contentEl.current.style.transition = offset === 0 ? 'transform 150ms ease, opacity 150ms ease' : 'none';
    }

    const absOffset = Math.abs(offset);
    const opacity = Math.min(1, absOffset / swipeThreshold);

    // Left action (revealed on swipe right, offset > 0)
    if (leftActionEl.current) {
      leftActionEl.current.style.opacity = String(offset > 0 ? opacity : 0);
      leftActionEl.current.style.visibility = offset > 0 ? 'visible' : 'hidden';
    }

    // Right action (revealed on swipe left, offset < 0)
    if (rightActionEl.current) {
      rightActionEl.current.style.opacity = String(offset < 0 ? opacity : 0);
      rightActionEl.current.style.visibility = offset < 0 ? 'visible' : 'hidden';
    }
  }, [swipeThreshold]);

  /** Snap offset back to zero (no action taken) */
  const resetOffset = useCallback(() => {
    applyOffset(0);
  }, [applyOffset]);

  const handleSwipeLeftComplete = useCallback(() => {
    setIsSwipeComplete(true);
    if (contentEl.current) {
      contentEl.current.style.opacity = '0';
      contentEl.current.style.transition = 'transform 150ms ease, opacity 150ms ease';
    }
    setTimeout(() => {
      onSwipeLeft();
      applyOffset(0);
      if (contentEl.current) {
        contentEl.current.style.opacity = '';
      }
      setIsSwipeComplete(false);
    }, completionAnimationMs);
  }, [onSwipeLeft, applyOffset, completionAnimationMs]);

  const handleSwipeRightComplete = useCallback(() => {
    applyOffset(0);
    onSwipeRight();
  }, [onSwipeRight, applyOffset]);

  const swipeHandlers = useSwipeable({
    onSwiping: (eventData) => {
      if (disabled) return;

      const { deltaX, deltaY, event } = eventData;

      // Determine swipe direction on first significant movement
      const isHorizontal = detectDirection(deltaX, deltaY);
      if (isHorizontal === null) return;

      // Let vertical swipes pass through for scrolling
      if (!isHorizontal) return;

      // Horizontal swipe -- prevent scroll and update offset via DOM
      if ('nativeEvent' in event) {
        event.nativeEvent.preventDefault();
      } else {
        event.preventDefault();
      }

      const clampedOffset = Math.max(-maxSwipe, Math.min(maxSwipe, deltaX));
      applyOffset(clampedOffset);
    },
    onSwipedLeft: (eventData) => {
      if (isHorizontalRef.current && Math.abs(eventData.deltaX) >= swipeThreshold) {
        handleSwipeLeftComplete();
      } else {
        resetOffset();
      }
      resetDirection();
    },
    onSwipedRight: (eventData) => {
      if (isHorizontalRef.current && Math.abs(eventData.deltaX) >= swipeThreshold) {
        handleSwipeRightComplete();
      } else {
        resetOffset();
      }
      resetDirection();
    },
    onTouchEndOrOnMouseUp: () => {
      if (Math.abs(offsetRef.current) < swipeThreshold) {
        resetOffset();
      }
      resetDirection();
    },
    trackMouse: false,
    trackTouch: true,
    preventScrollOnSwipe: false,
  });

  return {
    swipeHandlers,
    isSwipeComplete,
    contentRef,
    leftActionRef,
    rightActionRef,
  };
}
