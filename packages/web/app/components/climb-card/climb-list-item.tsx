'use client';

import React, { useState, useCallback } from 'react';
import { Button, Typography } from 'antd';
import SwipeableDrawer from '../swipeable-drawer/swipeable-drawer';
import { EllipsisOutlined, HeartOutlined, HeartFilled, PlusOutlined } from '@ant-design/icons';
import { useSwipeable } from 'react-swipeable';
import { Climb, BoardDetails } from '@/app/lib/types';
import ClimbThumbnail from './climb-thumbnail';
import DrawerClimbHeader from './drawer-climb-header';
import { AscentStatus } from '../queue-control/queue-list-item';
import { ClimbActions } from '../climb-actions';
import { useQueueContext } from '../graphql-queue';
import { useFavorite } from '../climb-actions';
import { useDoubleTap } from '@/app/lib/hooks/use-double-tap';
import { themeTokens } from '@/app/theme/theme-config';
import { getGradeColor, getGradeTintColor } from '@/app/lib/grade-colors';

const { Text } = Typography;

// Swipe threshold in pixels to trigger the swipe action
const SWIPE_THRESHOLD = 100;
// Maximum swipe distance
const MAX_SWIPE = 120;

type ClimbListItemProps = {
  climb: Climb;
  boardDetails: BoardDetails;
  selected?: boolean;
  onSelect?: () => void;
};

const ClimbListItem: React.FC<ClimbListItemProps> = React.memo(({ climb, boardDetails, selected, onSelect }) => {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isHorizontalSwipe, setIsHorizontalSwipe] = useState<boolean | null>(null);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const { addToQueue } = useQueueContext();
  const { isFavorited, toggleFavorite } = useFavorite({ climbUuid: climb.uuid });
  const { ref: doubleTapRef, onDoubleClick: handleDoubleClick } = useDoubleTap(onSelect);

  const handleSwipeLeft = useCallback(() => {
    // Swipe left = add to queue
    addToQueue(climb);
    setSwipeOffset(0);
  }, [climb, addToQueue]);

  const handleSwipeRight = useCallback(() => {
    // Swipe right = toggle favorite
    toggleFavorite();
    setSwipeOffset(0);
  }, [toggleFavorite]);

  const swipeHandlers = useSwipeable({
    onSwiping: (eventData) => {
      const { deltaX, deltaY, event } = eventData;

      // On first movement, determine if this is a horizontal or vertical swipe
      if (isHorizontalSwipe === null) {
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);
        if (absX > 10 || absY > 10) {
          setIsHorizontalSwipe(absX > absY);
        }
        return;
      }

      // If it's a vertical swipe, don't interfere
      if (!isHorizontalSwipe) return;

      // Horizontal swipe - prevent scroll and update offset
      if ('nativeEvent' in event) {
        event.nativeEvent.preventDefault();
      } else {
        event.preventDefault();
      }
      const clampedOffset = Math.max(-MAX_SWIPE, Math.min(MAX_SWIPE, deltaX));
      setSwipeOffset(clampedOffset);
    },
    onSwipedLeft: (eventData) => {
      if (isHorizontalSwipe && Math.abs(eventData.deltaX) >= SWIPE_THRESHOLD) {
        handleSwipeLeft();
      } else {
        setSwipeOffset(0);
      }
      setIsHorizontalSwipe(null);
    },
    onSwipedRight: (eventData) => {
      if (isHorizontalSwipe && Math.abs(eventData.deltaX) >= SWIPE_THRESHOLD) {
        handleSwipeRight();
      } else {
        setSwipeOffset(0);
      }
      setIsHorizontalSwipe(null);
    },
    onTouchEndOrOnMouseUp: () => {
      if (Math.abs(swipeOffset) < SWIPE_THRESHOLD) {
        setSwipeOffset(0);
      }
      setIsHorizontalSwipe(null);
    },
    trackMouse: false,
    trackTouch: true,
    preventScrollOnSwipe: false,
  });

  // Extract V grade for colorized display
  const vGradeMatch = climb.difficulty?.match(/V\d+/i);
  const vGrade = vGradeMatch ? vGradeMatch[0].toUpperCase() : null;
  const gradeColor = getGradeColor(climb.difficulty);
  const hasQuality = climb.quality_average && climb.quality_average !== '0';

  // Swipe action visibility
  const showLeftAction = swipeOffset > 0; // Swiping right reveals favorite on left
  const showRightAction = swipeOffset < 0; // Swiping left reveals queue on right
  const leftActionOpacity = Math.min(1, swipeOffset / SWIPE_THRESHOLD);
  const rightActionOpacity = Math.min(1, Math.abs(swipeOffset) / SWIPE_THRESHOLD);

  // Build exclude list for moonboard
  const excludeActions: ('tick' | 'openInApp' | 'mirror' | 'share' | 'viewDetails')[] = [];
  if (boardDetails.board_name === 'moonboard') {
    excludeActions.push('viewDetails');
  }

  return (
    <>
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        {/* Left action background (favorite - revealed on swipe right) */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: MAX_SWIPE,
            backgroundColor: themeTokens.colors.error,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            paddingLeft: themeTokens.spacing[4],
            opacity: leftActionOpacity,
            visibility: showLeftAction ? 'visible' : 'hidden',
          }}
        >
          {isFavorited ? (
            <HeartFilled style={{ color: 'white', fontSize: 20 }} />
          ) : (
            <HeartOutlined style={{ color: 'white', fontSize: 20 }} />
          )}
        </div>

        {/* Right action background (add to queue - revealed on swipe left) */}
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: MAX_SWIPE,
            backgroundColor: themeTokens.colors.primary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingRight: themeTokens.spacing[4],
            opacity: rightActionOpacity,
            visibility: showRightAction ? 'visible' : 'hidden',
          }}
        >
          <PlusOutlined style={{ color: 'white', fontSize: 20 }} />
        </div>

        {/* Swipeable content */}
        <div
          {...swipeHandlers}
          ref={(node: HTMLDivElement | null) => {
            doubleTapRef(node);
            swipeHandlers.ref(node);
          }}
          onDoubleClick={handleDoubleClick}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: `${themeTokens.spacing[2]}px ${themeTokens.spacing[3]}px`,
            gap: themeTokens.spacing[3],
            backgroundColor: selected ? (getGradeTintColor(climb.difficulty, 'light') ?? themeTokens.semantic.selected) : themeTokens.semantic.surface,
            borderBottom: `1px solid ${themeTokens.neutral[200]}`,
            transform: `translateX(${swipeOffset}px)`,
            transition: swipeOffset === 0 ? `transform ${themeTokens.transitions.fast}` : 'none',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          {/* Thumbnail */}
          <div style={{ width: themeTokens.spacing[16], flexShrink: 0 }}>
            <ClimbThumbnail
              boardDetails={boardDetails}
              currentClimb={climb}
              enableNavigation
            />
          </div>

          {/* Center: Name, quality, setter */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={{
                fontSize: themeTokens.typography.fontSize.xl,
                fontWeight: themeTokens.typography.fontWeight.semibold,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: 'block',
              }}
            >
              {climb.name}
            </Text>
            <Text
              type="secondary"
              style={{
                fontSize: themeTokens.typography.fontSize.xs,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: 'block',
              }}
            >
              {hasQuality ? `${climb.quality_average}\u2605` : ''}{' '}
              {climb.setter_username && `${climb.setter_username}`}
            </Text>
          </div>

          {/* Right: Ascent status + V-grade colorized */}
          <div style={{ display: 'flex', alignItems: 'center', gap: themeTokens.spacing[1], flexShrink: 0 }}>
            <AscentStatus climbUuid={climb.uuid} fontSize={20} />
            {vGrade && (
              <Text
                style={{
                  fontSize: themeTokens.typography.fontSize['2xl'],
                  fontWeight: themeTokens.typography.fontWeight.bold,
                  lineHeight: 1,
                  color: gradeColor ?? themeTokens.neutral[500],
                }}
              >
                {vGrade}
              </Text>
            )}
            {!vGrade && climb.difficulty && (
              <Text
                type="secondary"
                style={{
                  fontSize: themeTokens.typography.fontSize.sm,
                  fontWeight: themeTokens.typography.fontWeight.semibold,
                }}
              >
                {climb.difficulty}
              </Text>
            )}
          </div>

          {/* Ellipsis menu button */}
          <Button
            type="text"
            size="small"
            icon={<EllipsisOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              setIsActionsOpen(true);
            }}
            style={{ flexShrink: 0, color: themeTokens.neutral[400] }}
          />
        </div>
      </div>

      {/* Actions Drawer */}
      <SwipeableDrawer
        title={<DrawerClimbHeader climb={climb} boardDetails={boardDetails} />}
        placement="bottom"
        open={isActionsOpen}
        onClose={() => setIsActionsOpen(false)}
        swipeRegion="body"
        styles={{
          wrapper: { height: 'auto', width: '100%' },
          body: { padding: `${themeTokens.spacing[2]}px 0` },
        }}
      >
        <ClimbActions
          climb={climb}
          boardDetails={boardDetails}
          angle={climb.angle}
          viewMode="list"
          exclude={excludeActions}
          onActionComplete={() => setIsActionsOpen(false)}
        />
      </SwipeableDrawer>
    </>
  );
}, (prev, next) => {
  return prev.climb.uuid === next.climb.uuid
    && prev.selected === next.selected
    && prev.boardDetails === next.boardDetails;
});

ClimbListItem.displayName = 'ClimbListItem';

export default ClimbListItem;
