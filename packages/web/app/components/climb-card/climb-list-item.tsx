'use client';

import React, { useState, useCallback, useMemo } from 'react';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import SwipeableDrawer from '../swipeable-drawer/swipeable-drawer';
import MoreHorizOutlined from '@mui/icons-material/MoreHorizOutlined';
import FavoriteBorderOutlined from '@mui/icons-material/FavoriteBorderOutlined';
import Favorite from '@mui/icons-material/Favorite';
import AddOutlined from '@mui/icons-material/AddOutlined';
import { Climb, BoardDetails } from '@/app/lib/types';
import ClimbThumbnail from './climb-thumbnail';
import DrawerClimbHeader from './drawer-climb-header';
import { AscentStatus } from '../queue-control/queue-list-item';
import { ClimbActions } from '../climb-actions';
import { useQueueContext } from '../graphql-queue';
import { useFavorite } from '../climb-actions';
import { useSwipeActions } from '@/app/hooks/use-swipe-actions';
import { useDoubleTap } from '@/app/lib/hooks/use-double-tap';
import { themeTokens } from '@/app/theme/theme-config';
import { getSoftGradeColor, getGradeTintColor } from '@/app/lib/grade-colors';

// Maximum swipe distance
const MAX_SWIPE = 120;

type ClimbListItemProps = {
  climb: Climb;
  boardDetails: BoardDetails;
  selected?: boolean;
  onSelect?: () => void;
};

const ClimbListItem: React.FC<ClimbListItemProps> = React.memo(({ climb, boardDetails, selected, onSelect }) => {
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const { addToQueue } = useQueueContext();
  const { isFavorited, toggleFavorite } = useFavorite({ climbUuid: climb.uuid });
  const { ref: doubleTapRef, onDoubleClick: handleDoubleClick } = useDoubleTap(onSelect);

  const handleSwipeLeft = useCallback(() => {
    // Swipe left = add to queue
    addToQueue(climb);
  }, [climb, addToQueue]);

  const handleSwipeRight = useCallback(() => {
    // Swipe right = toggle favorite
    toggleFavorite();
  }, [toggleFavorite]);

  const { swipeHandlers, contentRef, leftActionRef, rightActionRef } = useSwipeActions({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
  });

  // Extract V grade for colorized display
  const vGradeMatch = climb.difficulty?.match(/V\d+/i);
  const vGrade = vGradeMatch ? vGradeMatch[0].toUpperCase() : null;
  const gradeColor = getSoftGradeColor(climb.difficulty);
  const hasQuality = climb.quality_average && climb.quality_average !== '0';

  // Build exclude list for moonboard
  const excludeActions: ('tick' | 'openInApp' | 'mirror' | 'share' | 'viewDetails')[] = [];
  if (boardDetails.board_name === 'moonboard') {
    excludeActions.push('viewDetails');
  }

  // Memoize style objects to prevent recreation on every render
  const containerStyle = useMemo(
    () => ({ position: 'relative' as const, overflow: 'hidden' as const }),
    [],
  );

  const leftActionStyle = useMemo(
    () => ({
      position: 'absolute' as const,
      left: 0,
      top: 0,
      bottom: 0,
      width: MAX_SWIPE,
      backgroundColor: themeTokens.colors.error,
      display: 'flex' as const,
      alignItems: 'center' as const,
      justifyContent: 'flex-start' as const,
      paddingLeft: themeTokens.spacing[4],
      opacity: 0,
      visibility: 'hidden' as const,
    }),
    [],
  );

  const rightActionStyle = useMemo(
    () => ({
      position: 'absolute' as const,
      right: 0,
      top: 0,
      bottom: 0,
      width: MAX_SWIPE,
      backgroundColor: themeTokens.colors.primary,
      display: 'flex' as const,
      alignItems: 'center' as const,
      justifyContent: 'flex-end' as const,
      paddingRight: themeTokens.spacing[4],
      opacity: 0,
      visibility: 'hidden' as const,
    }),
    [],
  );

  const iconStyle = useMemo(
    () => ({ color: 'white', fontSize: 20 }),
    [],
  );

  const swipeableContentStyle = useMemo(
    () => ({
      display: 'flex' as const,
      alignItems: 'center' as const,
      padding: `${themeTokens.spacing[2]}px ${themeTokens.spacing[3]}px`,
      gap: themeTokens.spacing[3],
      backgroundColor: selected
        ? (getGradeTintColor(climb.difficulty, 'light') ?? themeTokens.semantic.selected)
        : themeTokens.semantic.surface,
      borderBottom: `1px solid ${themeTokens.neutral[200]}`,
      cursor: 'pointer' as const,
      userSelect: 'none' as const,
    }),
    [selected, climb.difficulty],
  );

  const thumbnailStyle = useMemo(
    () => ({ width: themeTokens.spacing[16], flexShrink: 0 }),
    [],
  );

  const centerStyle = useMemo(
    () => ({ flex: 1, minWidth: 0 }),
    [],
  );

  const nameStyle = useMemo(
    () => ({
      fontSize: themeTokens.typography.fontSize.xl,
      fontWeight: themeTokens.typography.fontWeight.semibold,
      whiteSpace: 'nowrap' as const,
      overflow: 'hidden' as const,
      textOverflow: 'ellipsis' as const,
      display: 'block' as const,
    }),
    [],
  );

  const subtitleStyle = useMemo(
    () => ({
      fontSize: themeTokens.typography.fontSize.xs,
      whiteSpace: 'nowrap' as const,
      overflow: 'hidden' as const,
      textOverflow: 'ellipsis' as const,
      display: 'block' as const,
    }),
    [],
  );

  const rightContentStyle = useMemo(
    () => ({
      display: 'flex' as const,
      alignItems: 'center' as const,
      gap: themeTokens.spacing[1],
      flexShrink: 0,
    }),
    [],
  );

  const vGradeStyle = useMemo(
    () => ({
      fontSize: themeTokens.typography.fontSize['2xl'],
      fontWeight: themeTokens.typography.fontWeight.bold,
      lineHeight: 1,
      color: gradeColor ?? themeTokens.neutral[500],
    }),
    [gradeColor],
  );

  const difficultyStyle = useMemo(
    () => ({
      fontSize: themeTokens.typography.fontSize.sm,
      fontWeight: themeTokens.typography.fontWeight.semibold,
    }),
    [],
  );

  const iconButtonStyle = useMemo(
    () => ({ flexShrink: 0, color: themeTokens.neutral[400] }),
    [],
  );

  const drawerStyles = useMemo(
    () => ({
      wrapper: { height: 'auto', width: '100%' },
      body: { padding: `${themeTokens.spacing[2]}px 0` },
    }),
    [],
  );

  return (
    <>
      <div style={containerStyle}>
        {/* Left action background (favorite - revealed on swipe right) */}
        <div
          ref={leftActionRef}
          style={leftActionStyle}
        >
          {isFavorited ? (
            <Favorite style={iconStyle} />
          ) : (
            <FavoriteBorderOutlined style={iconStyle} />
          )}
        </div>

        {/* Right action background (add to queue - revealed on swipe left) */}
        <div
          ref={rightActionRef}
          style={rightActionStyle}
        >
          <AddOutlined style={iconStyle} />
        </div>

        {/* Swipeable content */}
        <div
          {...swipeHandlers}
          ref={(node: HTMLDivElement | null) => {
            doubleTapRef(node);
            swipeHandlers.ref(node);
            contentRef(node);
          }}
          onDoubleClick={handleDoubleClick}
          style={swipeableContentStyle}
        >
          {/* Thumbnail */}
          <div style={thumbnailStyle}>
            <ClimbThumbnail
              boardDetails={boardDetails}
              currentClimb={climb}
              enableNavigation
            />
          </div>

          {/* Center: Name, quality, setter */}
          <div style={centerStyle}>
            <Typography
              variant="body2"
              component="span"
              style={nameStyle}
            >
              {climb.name}
            </Typography>
            <Typography
              variant="body2"
              component="span"
              color="text.secondary"
              style={subtitleStyle}
            >
              {hasQuality ? `${climb.quality_average}\u2605` : ''}{' '}
              {climb.setter_username && `${climb.setter_username}`}
            </Typography>
          </div>

          {/* Right: Ascent status + V-grade colorized */}
          <div style={rightContentStyle}>
            <AscentStatus climbUuid={climb.uuid} fontSize={20} />
            {vGrade && (
              <Typography
                variant="body2"
                component="span"
                style={vGradeStyle}
              >
                {vGrade}
              </Typography>
            )}
            {!vGrade && climb.difficulty && (
              <Typography
                variant="body2"
                component="span"
                color="text.secondary"
                style={difficultyStyle}
              >
                {climb.difficulty}
              </Typography>
            )}
          </div>

          {/* Ellipsis menu button */}
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setIsActionsOpen(true);
            }}
            style={iconButtonStyle}
          >
            <MoreHorizOutlined />
          </IconButton>
        </div>
      </div>

      {/* Actions Drawer - only mount when open */}
      {isActionsOpen && (
        <SwipeableDrawer
          title={<DrawerClimbHeader climb={climb} boardDetails={boardDetails} />}
          placement="bottom"
          open={isActionsOpen}
          onClose={() => setIsActionsOpen(false)}
          styles={drawerStyles}
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
      )}
    </>
  );
}, (prev, next) => {
  return prev.climb.uuid === next.climb.uuid
    && prev.selected === next.selected
    && prev.boardDetails === next.boardDetails;
});

ClimbListItem.displayName = 'ClimbListItem';

export default ClimbListItem;
