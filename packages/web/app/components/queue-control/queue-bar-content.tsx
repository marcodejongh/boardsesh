'use client';

import React, { useMemo, useEffect, useRef } from 'react';
import { Card, Row, Col } from 'antd';
import ClimbTitle from '../climb-card/climb-title';
import ClimbThumbnail from '../climb-card/climb-thumbnail';
import { AscentStatus } from './queue-list-item';
import { getGradeTintColor } from '@/app/lib/grade-colors';
import { themeTokens } from '@/app/theme/theme-config';
import { EXIT_DURATION, SNAP_BACK_DURATION, ENTER_ANIMATION_DURATION } from '@/app/hooks/use-card-swipe-navigation';
import type { UseCardSwipeNavigationReturn } from '@/app/hooks/use-card-swipe-navigation';
import styles from './queue-control-bar.module.css';
import type { BoardDetails, Climb } from '@/app/lib/types';

export interface QueueBarContentProps {
  boardDetails: BoardDetails | null;
  currentClimb: Climb | null;
  nextClimb: Climb | null;
  prevClimb: Climb | null;
  // Swipe state from useCardSwipeNavigation
  swipeHandlers: UseCardSwipeNavigationReturn['swipeHandlers'];
  swipeOffset: number;
  isAnimating: boolean;
  animationDirection: 'left' | 'right' | null;
  enterDirection: 'from-left' | 'from-right' | null;
  clearEnterAnimation: () => void;
  // Click handler for the climb info area
  onClimbInfoClick?: () => void;
  // Optional extra className for the climb info click target
  climbInfoClassName?: string;
  // Optional id for the climb info click target (e.g. onboarding)
  climbInfoId?: string;
  // Thumbnail options
  enableThumbnailNavigation?: boolean;
  onThumbnailNavigate?: () => void;
  // Action buttons rendered on the right side
  actionButtons: React.ReactNode;
}

const QueueBarContent: React.FC<QueueBarContentProps> = ({
  boardDetails,
  currentClimb,
  nextClimb,
  prevClimb,
  swipeHandlers,
  swipeOffset,
  isAnimating,
  animationDirection,
  enterDirection,
  clearEnterAnimation,
  onClimbInfoClick,
  climbInfoClassName,
  climbInfoId,
  enableThumbnailNavigation,
  onThumbnailNavigate,
  actionButtons,
}) => {
  const enterFallbackRef = useRef<NodeJS.Timeout | null>(null);

  const gradeTintColor = useMemo(() => getGradeTintColor(currentClimb?.difficulty), [currentClimb?.difficulty]);

  // Clear enterDirection (for thumbnail crossfade) after animation plays
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

  // Transition style shared by current and peek text
  const getTextTransitionStyle = () => {
    // After navigation completes, snap instantly (no transition) to avoid
    // the new text sliding in from the old exit position
    if (enterDirection) return 'none';
    if (isAnimating) return `transform ${EXIT_DURATION}ms ease-out`;
    if (swipeOffset === 0) return `transform ${SNAP_BACK_DURATION}ms ease`;
    return 'none';
  };

  // Peek: determine which climb to preview during swipe
  const showPeek = swipeOffset !== 0 || isAnimating;
  const peekIsNext = animationDirection === 'left' || (animationDirection === null && swipeOffset < 0);
  const peekClimbData = peekIsNext ? nextClimb : prevClimb;

  // Peek transform: positioned one container-width away, moves with swipeOffset.
  // Clamped so the peek stops at position 0 and never overshoots past it.
  const getPeekTransform = () => {
    return peekIsNext
      ? `translateX(max(0px, calc(100% + ${swipeOffset}px)))`
      : `translateX(min(0px, calc(-100% + ${swipeOffset}px)))`;
  };

  return (
    <Card
      variant="borderless"
      styles={{ body: { padding: 0 } }}
      className={styles.card}
    >
      <div className={styles.swipeWrapper}>
        <div
          {...swipeHandlers}
          className={styles.swipeContainer}
          style={{
            padding: `6px ${themeTokens.spacing[3]}px 6px ${themeTokens.spacing[3]}px`,
            backgroundColor: gradeTintColor ?? themeTokens.semantic.surface,
          }}
        >
          <Row justify="space-between" align="middle" className={styles.row}>
            {/* Left section: Thumbnail and climb info */}
            <Col flex="auto" className={styles.climbInfoCol}>
              <div className={styles.climbInfoInner} style={{ gap: themeTokens.spacing[2] }}>
                {/* Board preview — STATIC, with crossfade on enter */}
                {boardDetails && (
                  <div className={`${styles.boardPreviewContainer} ${enterDirection ? styles.thumbnailEnter : ''}`}>
                    <ClimbThumbnail
                      boardDetails={boardDetails}
                      currentClimb={currentClimb}
                      enableNavigation={enableThumbnailNavigation}
                      onNavigate={onThumbnailNavigate}
                    />
                  </div>
                )}

                {/* Text swipe clip — overflow hidden to contain sliding text */}
                <div className={styles.textSwipeClip}>
                  {/* Current climb text — slides with finger */}
                  <div
                    id={climbInfoId}
                    onClick={onClimbInfoClick}
                    className={`${styles.queueToggle} ${climbInfoClassName ?? ''}`}
                    style={{
                      transform: `translateX(${swipeOffset}px)`,
                      transition: getTextTransitionStyle(),
                    }}
                  >
                    <ClimbTitle
                      climb={currentClimb}
                      showAngle
                      nameAddon={currentClimb?.name && <AscentStatus climbUuid={currentClimb.uuid} />}
                    />
                  </div>

                  {/* Peek text — shows next/previous climb sliding in from the edge */}
                  {showPeek && peekClimbData && (
                    <div
                      className={`${styles.queueToggle} ${styles.peekText}`}
                      style={{
                        transform: getPeekTransform(),
                        transition: getTextTransitionStyle(),
                      }}
                    >
                      <ClimbTitle
                        climb={peekClimbData}
                        showAngle
                        nameAddon={peekClimbData?.name && <AscentStatus climbUuid={peekClimbData.uuid} />}
                      />
                    </div>
                  )}
                </div>
              </div>
            </Col>

            {/* Button cluster — STATIC */}
            <Col flex="none" style={{ marginLeft: themeTokens.spacing[2] }}>
              {actionButtons}
            </Col>
          </Row>
        </div>
      </div>
    </Card>
  );
};

export default QueueBarContent;
