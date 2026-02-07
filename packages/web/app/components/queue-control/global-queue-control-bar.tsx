'use client';

import React, { useCallback } from 'react';
import { Button, Card, Row, Col, Space, Badge, Typography } from 'antd';
import { UnorderedListOutlined, TeamOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { track } from '@vercel/analytics';
import { usePersistentSession, useIsOnBoardRoute } from '../persistent-session';
import ClimbTitle from '../climb-card/climb-title';
import ClimbThumbnail from '../climb-card/climb-thumbnail';
import { TickButton } from '../logbook/tick-button';
import { useCardSwipeNavigation, EXIT_DURATION, SNAP_BACK_DURATION } from '@/app/hooks/use-card-swipe-navigation';
import { themeTokens } from '@/app/theme/theme-config';
import { constructClimbListWithSlugs } from '@/app/lib/url-utils';
import type { ClimbQueueItem } from './types';
import type { BoardDetails, Angle, Climb } from '@/app/lib/types';

const GlobalQueueControlBar: React.FC = () => {
  const router = useRouter();
  const isOnBoardRoute = useIsOnBoardRoute();
  const {
    activeSession,
    currentClimbQueueItem: partyCurrentClimbQueueItem,
    users,
    hasConnected,
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

  const handleSwipeNext = () => {
    if (!nextItem || !boardDetails || !localBoardPath) return;
    setLocalQueueState(localQueue, nextItem, localBoardPath, boardDetails);
    track('Global Bar Navigation', { direction: 'next', method: 'swipe' });
  };

  const handleSwipePrevious = () => {
    if (!prevItem || !boardDetails || !localBoardPath) return;
    setLocalQueueState(localQueue, prevItem, localBoardPath, boardDetails);
    track('Global Bar Navigation', { direction: 'previous', method: 'swipe' });
  };

  const canSwipeNext = !!nextItem;
  const canSwipePrevious = !!prevItem;

  return (
    <GlobalQueueControlBarInner
      boardDetails={boardDetails}
      currentClimb={currentClimb}
      angle={angle}
      queue={queue}
      isPartyMode={isPartyMode}
      userCount={users?.length ?? 0}
      canSwipeNext={canSwipeNext}
      canSwipePrevious={canSwipePrevious}
      onSwipeNext={handleSwipeNext}
      onSwipePrevious={handleSwipePrevious}
      onNavigateBack={handleNavigateBack}
      onQueueClick={handleNavigateBack}
    />
  );
};

// Inner component that uses the hook (hooks can't be called conditionally)
const GlobalQueueControlBarInner: React.FC<{
  boardDetails: BoardDetails | null;
  currentClimb: Climb | null;
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
  const { swipeHandlers, swipeOffset, isAnimating } = useCardSwipeNavigation({
    onSwipeNext,
    onSwipePrevious,
    canSwipeNext,
    canSwipePrevious,
    threshold: 80,
  });

  const getTransitionStyle = () => {
    if (isAnimating) return `transform ${EXIT_DURATION}ms ease-out`;
    if (swipeOffset === 0) return `transform ${SNAP_BACK_DURATION}ms ease`;
    return 'none';
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
        backgroundColor: themeTokens.semantic.surface,
        boxShadow: themeTokens.shadows.lg,
      }}
    >
      <Card
        variant="borderless"
        styles={{ body: { padding: 0 } }}
        style={{
          width: '100%',
          borderRadius: 0,
          margin: 0,
          borderTop: `1px solid ${themeTokens.neutral[200]}`,
        }}
      >
        <div style={{ position: 'relative', overflow: 'hidden' }}>
          <div
            {...swipeHandlers}
            style={{
              padding: `2px ${themeTokens.spacing[3]}px 0 ${themeTokens.spacing[3]}px`,
              transform: `translateX(${swipeOffset}px)`,
              transition: getTransitionStyle(),
              backgroundColor: themeTokens.semantic.surface,
              touchAction: 'pan-y',
            }}
          >
            <Row justify="space-between" align="middle" style={{ width: '100%' }}>
              <Col flex="auto" style={{ minWidth: 0 }}>
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: themeTokens.spacing[2], cursor: 'pointer' }}
                  onClick={onNavigateBack}
                >
                  {/* Thumbnail */}
                  {boardDetails && (
                    <div style={{ width: 36, height: 'auto', flexShrink: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                      <ClimbThumbnail
                        boardDetails={boardDetails}
                        currentClimb={currentClimb}
                      />
                    </div>
                  )}

                  {/* Climb info */}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <ClimbTitle
                      climb={currentClimb}
                      showAngle
                    />
                  </div>
                </div>
              </Col>

              <Col flex="none" style={{ marginLeft: themeTokens.spacing[2] }}>
                <Space>
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
                    />
                  )}
                </Space>
              </Col>
            </Row>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default GlobalQueueControlBar;
