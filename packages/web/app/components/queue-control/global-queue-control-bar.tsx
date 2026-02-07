'use client';

import React from 'react';
import { Button, Space, Badge } from 'antd';
import { UnorderedListOutlined, TeamOutlined, FastForwardOutlined, FastBackwardOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { track } from '@vercel/analytics';
import { usePersistentSession, useIsOnBoardRoute } from '../persistent-session';
import { BoardProvider } from '../board-provider/board-provider-context';
import { TickButton } from '../logbook/tick-button';
import { useCardSwipeNavigation } from '@/app/hooks/use-card-swipe-navigation';
import { constructClimbListWithSlugs } from '@/app/lib/url-utils';
import QueueBarContent from './queue-bar-content';
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
  const { swipeHandlers, swipeOffset, isAnimating, animationDirection, enterDirection, clearEnterAnimation } = useCardSwipeNavigation({
    onSwipeNext,
    onSwipePrevious,
    canSwipeNext,
    canSwipePrevious,
    threshold: 80,
    delayNavigation: true,
  });

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
        <QueueBarContent
          boardDetails={boardDetails}
          currentClimb={currentClimb}
          nextClimb={nextClimb}
          prevClimb={prevClimb}
          swipeHandlers={swipeHandlers}
          swipeOffset={swipeOffset}
          isAnimating={isAnimating}
          animationDirection={animationDirection}
          enterDirection={enterDirection}
          clearEnterAnimation={clearEnterAnimation}
          onClimbInfoClick={onNavigateBack}
          actionButtons={
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
          }
        />
      </div>
    </div>
  );
};

export default GlobalQueueControlBar;
