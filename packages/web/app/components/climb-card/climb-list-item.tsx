'use client';

import React, { useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import SwipeableDrawer from '../swipeable-drawer/swipeable-drawer';
import MoreHorizOutlined from '@mui/icons-material/MoreHorizOutlined';
import FavoriteBorderOutlined from '@mui/icons-material/FavoriteBorderOutlined';
import Favorite from '@mui/icons-material/Favorite';
import AddOutlined from '@mui/icons-material/AddOutlined';
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
import { getSoftGradeColor, getGradeTintColor } from '@/app/lib/grade-colors';

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
  const gradeColor = getSoftGradeColor(climb.difficulty);
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
      <Box sx={{ position: 'relative', overflow: 'hidden' }}>
        {/* Left action background (favorite - revealed on swipe right) */}
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: MAX_SWIPE,
            backgroundColor: themeTokens.colors.error,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            paddingLeft: `${themeTokens.spacing[4]}px`,
            opacity: leftActionOpacity,
            visibility: showLeftAction ? 'visible' : 'hidden',
          }}
        >
          {isFavorited ? (
            <Favorite sx={{ color: 'white', fontSize: 20 }} />
          ) : (
            <FavoriteBorderOutlined sx={{ color: 'white', fontSize: 20 }} />
          )}
        </Box>

        {/* Right action background (add to queue - revealed on swipe left) */}
        <Box
          sx={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: MAX_SWIPE,
            backgroundColor: themeTokens.colors.primary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingRight: `${themeTokens.spacing[4]}px`,
            opacity: rightActionOpacity,
            visibility: showRightAction ? 'visible' : 'hidden',
          }}
        >
          <AddOutlined sx={{ color: 'white', fontSize: 20 }} />
        </Box>

        {/* Swipeable content */}
        <Box
          {...swipeHandlers}
          ref={(node: HTMLDivElement | null) => {
            doubleTapRef(node);
            swipeHandlers.ref(node);
          }}
          onDoubleClick={handleDoubleClick}
          sx={{
            display: 'flex',
            alignItems: 'center',
            padding: `${themeTokens.spacing[2]}px ${themeTokens.spacing[3]}px`,
            gap: `${themeTokens.spacing[3]}px`,
            backgroundColor: selected ? (getGradeTintColor(climb.difficulty, 'light') ?? themeTokens.semantic.selected) : themeTokens.semantic.surface,
            borderBottom: `1px solid ${themeTokens.neutral[200]}`,
            transform: `translateX(${swipeOffset}px)`,
            transition: swipeOffset === 0 ? `transform ${themeTokens.transitions.fast}` : 'none',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          {/* Thumbnail */}
          <Box sx={{ width: themeTokens.spacing[16], flexShrink: 0 }}>
            <ClimbThumbnail
              boardDetails={boardDetails}
              currentClimb={climb}
              enableNavigation
            />
          </Box>

          {/* Center: Name, quality, setter */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="body2"
              component="span"
              sx={{
                fontSize: themeTokens.typography.fontSize.xl,
                fontWeight: themeTokens.typography.fontWeight.semibold,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: 'block',
              }}
            >
              {climb.name}
            </Typography>
            <Typography
              variant="body2"
              component="span"
              color="text.secondary"
              sx={{
                fontSize: themeTokens.typography.fontSize.xs,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: 'block',
              }}
            >
              {hasQuality ? `${climb.quality_average}\u2605` : ''}{' '}
              {climb.setter_username && `${climb.setter_username}`}
            </Typography>
          </Box>

          {/* Right: Ascent status + V-grade colorized */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: `${themeTokens.spacing[1]}px`, flexShrink: 0 }}>
            <AscentStatus climbUuid={climb.uuid} fontSize={20} />
            {vGrade && (
              <Typography
                variant="body2"
                component="span"
                sx={{
                  fontSize: themeTokens.typography.fontSize['2xl'],
                  fontWeight: themeTokens.typography.fontWeight.bold,
                  lineHeight: 1,
                  color: gradeColor ?? themeTokens.neutral[500],
                }}
              >
                {vGrade}
              </Typography>
            )}
            {!vGrade && climb.difficulty && (
              <Typography
                variant="body2"
                component="span"
                color="text.secondary"
                sx={{
                  fontSize: themeTokens.typography.fontSize.sm,
                  fontWeight: themeTokens.typography.fontWeight.semibold,
                }}
              >
                {climb.difficulty}
              </Typography>
            )}
          </Box>

          {/* Ellipsis menu button */}
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setIsActionsOpen(true);
            }}
            sx={{ flexShrink: 0, color: themeTokens.neutral[400] }}
          >
            <MoreHorizOutlined />
          </IconButton>
        </Box>
      </Box>

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
