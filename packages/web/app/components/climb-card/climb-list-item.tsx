'use client';

import React, { useState, useCallback } from 'react';
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

  return (
    <>
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        {/* Left action background (favorite - revealed on swipe right) */}
        <div
          ref={leftActionRef}
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
            opacity: 0,
            visibility: 'hidden',
          }}
        >
          {isFavorited ? (
            <Favorite style={{ color: 'white', fontSize: 20 }} />
          ) : (
            <FavoriteBorderOutlined style={{ color: 'white', fontSize: 20 }} />
          )}
        </div>

        {/* Right action background (add to queue - revealed on swipe left) */}
        <div
          ref={rightActionRef}
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
            opacity: 0,
            visibility: 'hidden',
          }}
        >
          <AddOutlined style={{ color: 'white', fontSize: 20 }} />
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
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: `${themeTokens.spacing[2]}px ${themeTokens.spacing[3]}px`,
            gap: themeTokens.spacing[3],
            backgroundColor: selected ? (getGradeTintColor(climb.difficulty, 'light') ?? themeTokens.semantic.selected) : themeTokens.semantic.surface,
            borderBottom: `1px solid ${themeTokens.neutral[200]}`,
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
            <Typography
              variant="body2"
              component="span"
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
            </Typography>
            <Typography
              variant="body2"
              component="span"
              color="text.secondary"
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
            </Typography>
          </div>

          {/* Right: Ascent status + V-grade colorized */}
          <div style={{ display: 'flex', alignItems: 'center', gap: themeTokens.spacing[1], flexShrink: 0 }}>
            <AscentStatus climbUuid={climb.uuid} fontSize={20} />
            {vGrade && (
              <Typography
                variant="body2"
                component="span"
                style={{
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
                style={{
                  fontSize: themeTokens.typography.fontSize.sm,
                  fontWeight: themeTokens.typography.fontWeight.semibold,
                }}
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
            style={{ flexShrink: 0, color: themeTokens.neutral[400] }}
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
