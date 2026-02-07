'use client';

import React, { useEffect, useRef } from 'react';
import BoardRenderer from './board-renderer';
import {
  useCardSwipeNavigation,
  EXIT_DURATION,
  SNAP_BACK_DURATION,
  ENTER_ANIMATION_DURATION,
} from '@/app/hooks/use-card-swipe-navigation';
import type { BoardDetails } from '@/app/lib/types';
import type { LitUpHoldsMap } from './types';
import styles from './swipe-board-carousel.module.css';

interface ClimbBoardData {
  litUpHoldsMap: LitUpHoldsMap;
  mirrored?: boolean;
}

export interface SwipeBoardCarouselProps {
  boardDetails: BoardDetails;
  currentClimb: ClimbBoardData;
  nextClimb?: ClimbBoardData | null;
  previousClimb?: ClimbBoardData | null;
  onSwipeNext: () => void;
  onSwipePrevious: () => void;
  canSwipeNext: boolean;
  canSwipePrevious: boolean;
  /** CSS class for the outer swipe container (must provide overflow:hidden, position:relative) */
  className?: string;
  /** CSS class for the inner board wrapper that translates during swipe */
  boardContainerClassName?: string;
}

const SwipeBoardCarousel: React.FC<SwipeBoardCarouselProps> = ({
  boardDetails,
  currentClimb,
  nextClimb,
  previousClimb,
  onSwipeNext,
  onSwipePrevious,
  canSwipeNext,
  canSwipePrevious,
  className,
  boardContainerClassName,
}) => {
  const enterFallbackRef = useRef<NodeJS.Timeout | null>(null);

  const { swipeHandlers, swipeOffset, isAnimating, animationDirection, enterDirection, clearEnterAnimation } =
    useCardSwipeNavigation({
      onSwipeNext,
      onSwipePrevious,
      canSwipeNext,
      canSwipePrevious,
      threshold: 80,
      delayNavigation: true,
    });

  // Clear enterDirection after enter transition completes
  useEffect(() => {
    if (enterDirection) {
      enterFallbackRef.current = setTimeout(() => {
        clearEnterAnimation();
      }, ENTER_ANIMATION_DURATION);
    }
    return () => {
      if (enterFallbackRef.current) {
        clearTimeout(enterFallbackRef.current);
        enterFallbackRef.current = null;
      }
    };
  }, [enterDirection, clearEnterAnimation]);

  const getSwipeTransition = () => {
    if (enterDirection) return 'none';
    if (isAnimating) return `transform ${EXIT_DURATION}ms ease-out`;
    if (swipeOffset === 0) return `transform ${SNAP_BACK_DURATION}ms ease`;
    return 'none';
  };

  // Peek: determine which climb to preview during swipe
  const showPeek = swipeOffset !== 0 || isAnimating;
  const peekIsNext = animationDirection === 'left' || (animationDirection === null && swipeOffset < 0);
  const peekClimb = peekIsNext ? nextClimb : previousClimb;

  const getPeekTransform = () => {
    return peekIsNext
      ? `translateX(max(0px, calc(100% + ${swipeOffset}px)))`
      : `translateX(min(0px, calc(-100% + ${swipeOffset}px)))`;
  };

  const transition = getSwipeTransition();

  return (
    <div className={`${styles.carouselContainer} ${className ?? ''}`} {...swipeHandlers}>
      <div
        className={boardContainerClassName}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition,
        }}
      >
        <BoardRenderer
          boardDetails={boardDetails}
          litUpHoldsMap={currentClimb.litUpHoldsMap}
          mirrored={!!currentClimb.mirrored}
          fillHeight
        />
      </div>
      {showPeek && peekClimb && (
        <div
          className={styles.peekBoardContainer}
          style={{
            transform: getPeekTransform(),
            transition,
          }}
        >
          <BoardRenderer
            boardDetails={boardDetails}
            litUpHoldsMap={peekClimb.litUpHoldsMap}
            mirrored={!!peekClimb.mirrored}
            fillHeight
          />
        </div>
      )}
    </div>
  );
};

export default SwipeBoardCarousel;
