'use client';

import React, { useMemo, useEffect, useRef } from 'react';
import { Button, Card, Row, Col, Space, Badge } from 'antd';
import { UnorderedListOutlined, TeamOutlined, FastForwardOutlined, FastBackwardOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { track } from '@vercel/analytics';
import { usePersistentSession, useIsOnBoardRoute } from '../persistent-session';
import { BoardProvider } from '../board-provider/board-provider-context';
import ClimbTitle from '../climb-card/climb-title';
import ClimbThumbnail from '../climb-card/climb-thumbnail';
import { TickButton } from '../logbook/tick-button';
import { AscentStatus } from './queue-list-item';
import { useCardSwipeNavigation, EXIT_DURATION, SNAP_BACK_DURATION, ENTER_ANIMATION_DURATION } from '@/app/hooks/use-card-swipe-navigation';
import { getGradeTintColor } from '@/app/lib/grade-colors';
import { themeTokens } from '@/app/theme/theme-config';
import { constructClimbListWithSlugs } from '@/app/lib/url-utils';
import styles from './queue-control-bar.module.css';
import type { ClimbQueueItem } from './types';
import type { BoardDetails, Angle, Climb } from '@/app/lib/types';

const GlobalQueueControlBar: React.FC = () => {
  const router = useRouter();
  const isOnBoardRoute = useIsOnBoardRoute();
  const {
    activeSession,
    currentClimbQueueItem: partyCurrentClimbQueueItem,
    users,
    localQueue,
    localCurrentClimbQueueItem,
    localBoardPath,
    localBoardDetails,
    setLocalQueueState,
  } = usePersistentSession();

  // Determine mode and values
  const isPartyMode = !!activeSession;
  const boardDetails = isPartyMode ? activeSession.boardDetails : localBoardDetails;
  const currentClimbQueueItem = isPartyMode ? partyCurrentClimbQueueItem : localCurrentClimbQueueItem;
  const currentClimb = currentClimbQueueItem?.climb ?? null;
  const queue = isPartyMode ? [] : localQueue;
  const angle = isPartyMode
    ? activeSession.parsedParams.angle
    : (localCurrentClimbQueueItem?.climb?.angle ?? 0);

  // Visibility: only show when off board routes and there's something to show
  const hasContent = localQueue.length > 0 || !!localCurrentClimbQueueItem || !!activeSession;
  if (!hasContent || isOnBoardRoute) {
    return null;
  }

  // Build navigation URL back to board route
  const getBoardUrl = () => {
    if (isPartyMode) {
      const { parsedParams, sessionId } = activeSession;
      const url = boardDetails?.layout_name && boardDetails?.size_name && boardDetails?.set_names
        ? `${constructClimbListWithSlugs(
            boardDetails.board_name,
            boardDetails.layout_name,
            boardDetails.size_name,
            boardDetails.size_description,
            boardDetails.set_names,
            parsedParams.angle,
          )}?session=${sessionId}`
        : `${activeSession.boardPath}?session=${sessionId}`;
      return url;
    }
    return localBoardPath || '/';
  };

  const handleNavigateBack = () => {
    router.push(getBoardUrl());
  };

  // Swipe navigation for local mode
  const getAdjacentItem = (direction: 'next' | 'previous'): ClimbQueueItem | null => {
    if (isPartyMode || !localCurrentClimbQueueItem) return null;
    const currentIndex = localQueue.findIndex((item) => item.uuid === localCurrentClimbQueueItem.uuid);
    if (currentIndex === -1) return null;
    const targetIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    return localQueue[targetIndex] ?? null;
  };

  const nextItem = getAdjacentItem('next');
  const prevItem = getAdjacentItem('previous');

  const handleNavigateNext = () => {
    if (!nextItem || !boardDetails || !localBoardPath) return;
    setLocalQueueState(localQueue, nextItem, localBoardPath, boardDetails);
    track('Global Bar Navigation', { direction: 'next', method: 'swipe' });
  };

  const handleNavigatePrevious = () => {
    if (!prevItem || !boardDetails || !localBoardPath) return;
    setLocalQueueState(localQueue, prevItem, localBoardPath, boardDetails);
    track('Global Bar Navigation', { direction: 'previous', method: 'swipe' });
  };

  const canSwipeNext = !!nextItem;
  const canSwipePrevious = !!prevItem;

  const inner = (
    <GlobalQueueControlBarInner
      boardDetails={boardDetails}
      currentClimb={currentClimb}
      nextClimb={nextItem?.climb ?? null}
      prevClimb={prevItem?.climb ?? null}
      angle={angle}
      queue={queue}
      isPartyMode={isPartyMode}
      userCount={users?.length ?? 0}
      canSwipeNext={canSwipeNext}
      canSwipePrevious={canSwipePrevious}
      onSwipeNext={handleNavigateNext}
      onSwipePrevious={handleNavigatePrevious}
      onNavigateBack={handleNavigateBack}
      onQueueClick={handleNavigateBack}
    />
  );

  // Wrap with BoardProvider so TickButton and other board-dependent
  // components work correctly even on non-board routes like /settings
  if (boardDetails) {
    return <BoardProvider boardName={boardDetails.board_name}>{inner}</BoardProvider>;
  }

  return inner;
};

// Inner component that uses hooks (hooks can't be called conditionally)
const GlobalQueueControlBarInner: React.FC<{
  boardDetails: BoardDetails | null;
  currentClimb: Climb | null;
  nextClimb: Climb | null;
  prevClimb: Climb | null;
  angle: Angle;
  queue: ClimbQueueItem[];
  isPartyMode: boolean;
  userCount: number;
  canSwipeNext: boolean;
  canSwipePrevious: boolean;
  onSwipeNext: () => void;
  onSwipePrevious: () => void;
  onNavigateBack: () => void;
  onQueueClick: () => void;
}> = ({
  boardDetails,
  currentClimb,
  nextClimb,
  prevClimb,
  angle,
  queue,
  isPartyMode,
  userCount,
  canSwipeNext,
  canSwipePrevious,
  onSwipeNext,
  onSwipePrevious,
  onNavigateBack,
  onQueueClick,
}) => {
  const enterFallbackRef = useRef<NodeJS.Timeout | null>(null);

  const { swipeHandlers, swipeOffset, isAnimating, animationDirection, enterDirection, clearEnterAnimation } = useCardSwipeNavigation({
    onSwipeNext,
    onSwipePrevious,
    canSwipeNext,
    canSwipePrevious,
    threshold: 80,
    delayNavigation: true,
  });

  const gradeTintColor = useMemo(() => getGradeTintColor(currentClimb?.difficulty), [currentClimb?.difficulty]);

  // Clear enterDirection (for thumbnail crossfade) after it plays
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

  // Peek transform: positioned one container-width away, moves with swipeOffset
  const getPeekTransform = () => {
    return peekIsNext
      ? `translateX(max(0px, calc(100% + ${swipeOffset}px)))`
      : `translateX(min(0px, calc(-100% + ${swipeOffset}px)))`;
  };

  return (
    <div
      data-testid="global-queue-control-bar"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        width: '100%',
        zIndex: 999,
      }}
    >
      <div className={`queue-bar-shadow ${styles.queueBar}`}>
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
                        />
                      </div>
                    )}

                    {/* Text swipe clip — overflow hidden to contain sliding text */}
                    <div className={styles.textSwipeClip}>
                      {/* Current climb text — slides with finger */}
                      <div
                        onClick={onNavigateBack}
                        className={styles.queueToggle}
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
                  <Space>
                    {/* Navigation buttons - desktop only */}
                    <span className={styles.navButtons}>
                      <Space>
                        <Button
                          type="text"
                          icon={<FastBackwardOutlined />}
                          aria-label="Previous climb"
                          disabled={!canSwipePrevious}
                          onClick={onSwipePrevious}
                        />
                        <Button
                          type="text"
                          icon={<FastForwardOutlined />}
                          aria-label="Next climb"
                          disabled={!canSwipeNext}
                          onClick={onSwipeNext}
                        />
                      </Space>
                    </span>

                    {/* Party indicator or queue count */}
                    {isPartyMode ? (
                      <Badge count={userCount} size="small" color="cyan">
                        <Button
                          icon={<TeamOutlined />}
                          type="primary"
                          onClick={onNavigateBack}
                        />
                      </Badge>
                    ) : (
                      <Badge count={queue.length} overflowCount={99} showZero={false} color="cyan">
                        <Button
                          icon={<UnorderedListOutlined />}
                          onClick={onQueueClick}
                          aria-label="Open queue"
                        />
                      </Badge>
                    )}

                    {/* Tick button */}
                    {boardDetails && (
                      <TickButton
                        currentClimb={currentClimb}
                        angle={angle}
                        boardDetails={boardDetails}
                        buttonType="text"
                      />
                    )}
                  </Space>
                </Col>
              </Row>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default GlobalQueueControlBar;
