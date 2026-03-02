'use client';

import React, { useState, useCallback, useMemo } from 'react';
import IconButton from '@mui/material/IconButton';
import { usePathname } from 'next/navigation';
import SwipeableDrawer from '../swipeable-drawer/swipeable-drawer';
import MoreHorizOutlined from '@mui/icons-material/MoreHorizOutlined';
import FavoriteBorderOutlined from '@mui/icons-material/FavoriteBorderOutlined';
import Favorite from '@mui/icons-material/Favorite';
import AddOutlined from '@mui/icons-material/AddOutlined';
import { Climb, BoardDetails } from '@/app/lib/types';
import ClimbThumbnail from './climb-thumbnail';
import ClimbTitle from './climb-title';
import DrawerClimbHeader from './drawer-climb-header';
import { AscentStatus } from '../queue-control/queue-list-item';
import { ClimbActions } from '../climb-actions';
import PlaylistSelectionContent from '../climb-actions/playlist-selection-content';
import { useOptionalQueueContext } from '../graphql-queue';
import { useFavorite } from '../climb-actions';
import { useSwipeActions } from '@/app/hooks/use-swipe-actions';
import { useDoubleTap } from '@/app/lib/hooks/use-double-tap';
import { themeTokens } from '@/app/theme/theme-config';
import { getGradeTintColor } from '@/app/lib/grade-colors';
import { useIsDarkMode } from '@/app/hooks/use-is-dark-mode';
import { getExcludedClimbActions } from '@/app/lib/climb-action-utils';

// Maximum swipe distance
const MAX_SWIPE = 120;

type ClimbListItemProps = {
  climb: Climb;
  boardDetails: BoardDetails;
  selected?: boolean;
  /** When true, the item is visually dimmed (greyed out) but still interactive */
  unsupported?: boolean;
  /** When true, swipe gestures (favorite/queue) are disabled */
  disableSwipe?: boolean;
  onSelect?: () => void;
};

const ClimbListItem: React.FC<ClimbListItemProps> = React.memo(({ climb, boardDetails, selected, unsupported, disableSwipe, onSelect }) => {
  const pathname = usePathname();
  const isDark = useIsDarkMode();
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [isPlaylistSelectorOpen, setIsPlaylistSelectorOpen] = useState(false);
  const queueContext = useOptionalQueueContext();
  const addToQueue = queueContext?.addToQueue;
  const { isFavorited, toggleFavorite } = useFavorite({ climbUuid: climb.uuid });
  const { ref: doubleTapRef, onDoubleClick: handleDoubleClick } = useDoubleTap(onSelect);

  const handleSwipeLeft = useCallback(() => {
    // Swipe left = add to queue
    addToQueue?.(climb);
  }, [climb, addToQueue]);

  const handleSwipeRightLong = useCallback(() => {
    // Long swipe right = open add-to-playlist drawer
    setIsActionsOpen(false);
    setIsPlaylistSelectorOpen(true);
  }, []);

  const handleSwipeRight = useCallback(() => {
    // Swipe right = toggle favorite
    toggleFavorite();
  }, [toggleFavorite]);

  const { swipeHandlers, contentRef, leftActionRef, rightActionRef } = useSwipeActions({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
    onSwipeRightLong: handleSwipeRightLong,
    swipeThreshold: 90,
    longSwipeRightThreshold: 150,
    maxSwipe: 180,
    disabled: disableSwipe,
  });

  const excludeActions = getExcludedClimbActions(boardDetails.board_name, 'list');

  // Memoize style objects to prevent recreation on every render
  const containerStyle = useMemo(
    () => ({
      position: 'relative' as const,
      overflow: 'hidden' as const,
      ...(unsupported ? { opacity: 0.5, filter: 'grayscale(80%)' } : {}),
    }),
    [unsupported],
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
      padding: `${themeTokens.spacing[2]}px ${themeTokens.spacing[2]}px`,
      gap: themeTokens.spacing[3],
      backgroundColor: selected
        ? (getGradeTintColor(climb.difficulty, 'light', isDark) ?? 'var(--semantic-selected)')
        : 'var(--semantic-surface)',
      borderBottom: `1px solid var(--neutral-200)`,
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

  const iconButtonStyle = useMemo(
    () => ({ flexShrink: 0, color: 'var(--neutral-400)' }),
    [],
  );

  const drawerStyles = useMemo(
    () => ({
      wrapper: { height: 'auto', width: '100%' },
      body: { padding: `${themeTokens.spacing[2]}px 0` },
      header: { paddingLeft: `${themeTokens.spacing[3]}px`, paddingRight: `${themeTokens.spacing[3]}px` },
    }),
    [],
  );

  return (
    <>
      <div style={containerStyle}>
        {!disableSwipe && (
          <>
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
          </>
        )}

        {/* Content (swipeable when swipe is enabled) */}
        <div
          {...(disableSwipe ? {} : swipeHandlers)}
          ref={(node: HTMLDivElement | null) => {
            doubleTapRef(node);
            if (!disableSwipe) {
              swipeHandlers.ref(node);
              contentRef(node);
            }
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

          {/* Center + Right: Name, stars, setter, colorized grade */}
          <div style={centerStyle}>
            <ClimbTitle
              climb={climb}
              gradePosition="right"
              showSetterInfo
              titleFontSize={themeTokens.typography.fontSize.xl}
              rightAddon={<AscentStatus climbUuid={climb.uuid} fontSize={20} />}
            />
          </div>

          {/* Ellipsis menu button */}
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setIsPlaylistSelectorOpen(false);
              setIsActionsOpen(true);
            }}
            style={iconButtonStyle}
          >
            <MoreHorizOutlined />
          </IconButton>
        </div>
      </div>

      {/* Actions Drawer */}
      <SwipeableDrawer
        title={<DrawerClimbHeader climb={climb} boardDetails={boardDetails} />}
        placement="bottom"
        open={isActionsOpen}
        onClose={() => setIsActionsOpen(false)}
        styles={drawerStyles}
        keepMounted={false}
      >
        <ClimbActions
          climb={climb}
          boardDetails={boardDetails}
          angle={climb.angle}
          currentPathname={pathname}
          viewMode="list"
          exclude={excludeActions}
          onOpenPlaylistSelector={() => {
            setIsActionsOpen(false);
            setIsPlaylistSelectorOpen(true);
          }}
          onActionComplete={() => setIsActionsOpen(false)}
        />
      </SwipeableDrawer>

      <SwipeableDrawer
        title={<DrawerClimbHeader climb={climb} boardDetails={boardDetails} />}
        placement="bottom"
        open={isPlaylistSelectorOpen}
        onClose={() => setIsPlaylistSelectorOpen(false)}
        styles={{
          wrapper: { height: 'auto', maxHeight: '70vh', width: '100%' },
          body: { padding: 0 },
          header: { paddingLeft: `${themeTokens.spacing[3]}px`, paddingRight: `${themeTokens.spacing[3]}px` },
        }}
        keepMounted={false}
      >
        <PlaylistSelectionContent
          climbUuid={climb.uuid}
          boardDetails={boardDetails}
          angle={climb.angle}
          onDone={() => setIsPlaylistSelectorOpen(false)}
        />
      </SwipeableDrawer>
    </>
  );
}, (prev, next) => {
  return prev.climb.uuid === next.climb.uuid
    && prev.selected === next.selected
    && prev.unsupported === next.unsupported
    && prev.disableSwipe === next.disableSwipe
    && prev.boardDetails === next.boardDetails;
});

ClimbListItem.displayName = 'ClimbListItem';

export default ClimbListItem;
