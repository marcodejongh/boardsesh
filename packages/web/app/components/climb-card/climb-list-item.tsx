'use client';

import React, { useState, useCallback, useMemo } from 'react';
import IconButton from '@mui/material/IconButton';
import { usePathname } from 'next/navigation';
import SwipeableDrawer from '../swipeable-drawer/swipeable-drawer';
import MoreHorizOutlined from '@mui/icons-material/MoreHorizOutlined';
import FavoriteBorderOutlined from '@mui/icons-material/FavoriteBorderOutlined';
import Favorite from '@mui/icons-material/Favorite';
import AddOutlined from '@mui/icons-material/AddOutlined';
import LocalOfferOutlined from '@mui/icons-material/LocalOfferOutlined';
import { Climb, BoardDetails } from '@/app/lib/types';
import ClimbThumbnail from './climb-thumbnail';
import ClimbTitle, { type ClimbTitleProps } from './climb-title';
import DrawerClimbHeader from './drawer-climb-header';
import { AscentStatus } from './ascent-status';
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

// Keep swipe visuals aligned with gesture max distance
const MAX_GESTURE_SWIPE = 180;
const SHORT_ACTION_WIDTH = 120;
const LONG_SWIPE_ACTION_WIDTH = MAX_GESTURE_SWIPE;
const SHORT_RIGHT_SWIPE_THRESHOLD = 90;
const LONG_RIGHT_SWIPE_THRESHOLD = 150;

// Simple swipe constants for override mode (no long-swipe)
const SIMPLE_MAX_SWIPE = 120;
const SIMPLE_SWIPE_THRESHOLD = 100;

export type SwipeActionOverride = {
  icon: React.ReactNode;
  color: string;
  onAction: () => void;
};

type ClimbListItemProps = {
  climb: Climb;
  boardDetails: BoardDetails;
  selected?: boolean;
  /** When true, the item is visually dimmed (greyed out) but still interactive */
  unsupported?: boolean;
  /** When true, swipe gestures (favorite/queue) are disabled */
  disableSwipe?: boolean;
  onSelect?: () => void;
  /** Override the left swipe action (revealed on swipe right). Default: favorite/playlist */
  swipeLeftAction?: SwipeActionOverride;
  /** Override the right swipe action (revealed on swipe left). Default: add to queue */
  swipeRightAction?: SwipeActionOverride;
  /** Content rendered between the title and menu button (e.g., avatar) */
  afterTitleSlot?: React.ReactNode;
  /** Replace the default menu button + actions drawer with custom content */
  menuSlot?: React.ReactNode;
  /** Override ClimbTitle props. When provided, replaces the defaults entirely. */
  titleProps?: Partial<ClimbTitleProps>;
  /** Override background color of the swipeable content */
  backgroundColor?: string;
  /** Override content opacity (e.g., 0.6 for history items) */
  contentOpacity?: number;
  /** When true, disables thumbnail click-to-navigate (e.g., in edit mode) */
  disableThumbnailNavigation?: boolean;
};

const ClimbListItem: React.FC<ClimbListItemProps> = React.memo(({
  climb,
  boardDetails,
  selected,
  unsupported,
  disableSwipe,
  onSelect,
  swipeLeftAction,
  swipeRightAction,
  afterTitleSlot,
  menuSlot,
  titleProps,
  backgroundColor,
  contentOpacity,
  disableThumbnailNavigation,
}) => {
  const pathname = usePathname();
  const isDark = useIsDarkMode();
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [isPlaylistSelectorOpen, setIsPlaylistSelectorOpen] = useState(false);
  const [rightSwipeOffset, setRightSwipeOffset] = useState(0);
  const queueContext = useOptionalQueueContext();
  const addToQueue = queueContext?.addToQueue;
  const { isFavorited, toggleFavorite } = useFavorite({ climbUuid: climb.uuid });
  const { ref: doubleTapRef, onDoubleClick: handleDoubleClick } = useDoubleTap(onSelect);

  const hasSwipeOverrides = Boolean(swipeLeftAction || swipeRightAction);

  // Default swipe handlers (used when no overrides)
  const handleDefaultSwipeLeft = useCallback(() => {
    addToQueue?.(climb);
  }, [climb, addToQueue]);

  const handleDefaultSwipeRightLong = useCallback(() => {
    setIsActionsOpen(false);
    setIsPlaylistSelectorOpen(true);
  }, []);

  const handleDefaultSwipeRight = useCallback(() => {
    toggleFavorite();
  }, [toggleFavorite]);

  // Override swipe handlers
  const handleOverrideSwipeLeft = useCallback(() => {
    swipeRightAction?.onAction();
  }, [swipeRightAction]);

  const handleOverrideSwipeRight = useCallback(() => {
    swipeLeftAction?.onAction();
  }, [swipeLeftAction]);

  // Use override or default swipe configuration
  const { swipeHandlers, isSwipeComplete, contentRef, leftActionRef, rightActionRef } = useSwipeActions({
    onSwipeLeft: hasSwipeOverrides ? handleOverrideSwipeLeft : handleDefaultSwipeLeft,
    onSwipeRight: hasSwipeOverrides ? handleOverrideSwipeRight : handleDefaultSwipeRight,
    onSwipeRightLong: hasSwipeOverrides ? undefined : handleDefaultSwipeRightLong,
    onSwipeOffsetChange: hasSwipeOverrides ? undefined : (offset) => setRightSwipeOffset(offset > 0 ? offset : 0),
    swipeThreshold: hasSwipeOverrides ? SIMPLE_SWIPE_THRESHOLD : SHORT_RIGHT_SWIPE_THRESHOLD,
    longSwipeRightThreshold: hasSwipeOverrides ? undefined : LONG_RIGHT_SWIPE_THRESHOLD,
    maxSwipe: hasSwipeOverrides ? SIMPLE_MAX_SWIPE : MAX_GESTURE_SWIPE,
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

  const rightSwipeBaseOpacity = useMemo(
    () => Math.min(1, rightSwipeOffset / SHORT_RIGHT_SWIPE_THRESHOLD),
    [rightSwipeOffset],
  );

  const longSwipeBlend = useMemo(() => {
    const transitionRange = LONG_RIGHT_SWIPE_THRESHOLD - SHORT_RIGHT_SWIPE_THRESHOLD;
    if (transitionRange <= 0) return 1;
    return Math.max(0, Math.min(1, (rightSwipeOffset - SHORT_RIGHT_SWIPE_THRESHOLD) / transitionRange));
  }, [rightSwipeOffset]);

  const shortSwipeLayerOpacity = useMemo(
    () => rightSwipeBaseOpacity * (1 - longSwipeBlend),
    [rightSwipeBaseOpacity, longSwipeBlend],
  );

  const longSwipeLayerOpacity = useMemo(
    () => rightSwipeBaseOpacity * longSwipeBlend,
    [rightSwipeBaseOpacity, longSwipeBlend],
  );

  const defaultLeftActionStyle = useMemo(
    () => ({
      position: 'absolute' as const,
      left: 0,
      top: 0,
      bottom: 0,
      width: SHORT_ACTION_WIDTH + ((LONG_SWIPE_ACTION_WIDTH - SHORT_ACTION_WIDTH) * longSwipeBlend),
      display: 'flex' as const,
      alignItems: 'center' as const,
      justifyContent: 'flex-start' as const,
      paddingLeft: themeTokens.spacing[3],
      opacity: 0,
      visibility: 'hidden' as const,
      overflow: 'hidden' as const,
    }),
    [longSwipeBlend],
  );

  const swipeActionLayerBaseStyle = useMemo(
    () => ({
      position: 'absolute' as const,
      inset: 0,
      display: 'flex' as const,
      alignItems: 'center' as const,
      justifyContent: 'flex-start' as const,
      paddingLeft: themeTokens.spacing[4],
      willChange: 'opacity' as const,
    }),
    [],
  );

  const shortSwipeLayerStyle = useMemo(
    () => ({
      ...swipeActionLayerBaseStyle,
      backgroundColor: themeTokens.colors.error,
      opacity: shortSwipeLayerOpacity,
    }),
    [swipeActionLayerBaseStyle, shortSwipeLayerOpacity],
  );

  const longSwipeLayerStyle = useMemo(
    () => ({
      ...swipeActionLayerBaseStyle,
      backgroundColor: themeTokens.colors.primary,
      opacity: longSwipeLayerOpacity,
    }),
    [swipeActionLayerBaseStyle, longSwipeLayerOpacity],
  );

  const defaultRightActionStyle = useMemo(
    () => ({
      position: 'absolute' as const,
      right: 0,
      top: 0,
      bottom: 0,
      width: MAX_GESTURE_SWIPE,
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

  // Simple swipe action styles (used when overrides are provided)
  const simpleLeftActionStyle = useMemo(
    () => ({
      position: 'absolute' as const,
      left: 0,
      top: 0,
      bottom: 0,
      width: SIMPLE_MAX_SWIPE,
      backgroundColor: swipeLeftAction?.color ?? themeTokens.colors.success,
      display: 'flex' as const,
      alignItems: 'center' as const,
      justifyContent: 'flex-start' as const,
      paddingLeft: themeTokens.spacing[4],
      opacity: 0,
      visibility: 'hidden' as const,
    }),
    [swipeLeftAction?.color],
  );

  const simpleRightActionStyle = useMemo(
    () => ({
      position: 'absolute' as const,
      right: 0,
      top: 0,
      bottom: 0,
      width: SIMPLE_MAX_SWIPE,
      backgroundColor: swipeRightAction?.color ?? themeTokens.colors.error,
      display: 'flex' as const,
      alignItems: 'center' as const,
      justifyContent: 'flex-end' as const,
      paddingRight: themeTokens.spacing[4],
      opacity: 0,
      visibility: 'hidden' as const,
    }),
    [swipeRightAction?.color],
  );

  const iconStyle = useMemo(
    () => ({ color: 'white', fontSize: 20 }),
    [],
  );

  const resolvedBg = backgroundColor
    ?? (selected
      ? (getGradeTintColor(climb.difficulty, 'light', isDark) ?? 'var(--semantic-selected)')
      : 'var(--semantic-surface)');

  const swipeableContentStyle = useMemo(
    () => ({
      display: 'flex' as const,
      alignItems: 'center' as const,
      padding: `${themeTokens.spacing[2]}px ${themeTokens.spacing[2]}px`,
      gap: themeTokens.spacing[3],
      backgroundColor: resolvedBg,
      borderBottom: `1px solid var(--neutral-200)`,
      cursor: 'pointer' as const,
      userSelect: 'none' as const,
      opacity: isSwipeComplete ? 0 : (contentOpacity ?? 1),
    }),
    [resolvedBg, isSwipeComplete, contentOpacity],
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

  // Default ClimbTitle props when no override is provided
  const resolvedTitleProps: Partial<ClimbTitleProps> = titleProps ?? {
    gradePosition: 'right',
    showSetterInfo: true,
    titleFontSize: themeTokens.typography.fontSize.xl,
    rightAddon: <AscentStatus climbUuid={climb.uuid} fontSize={20} />,
  };

  return (
    <>
      <div style={containerStyle}>
        {!disableSwipe && (
          hasSwipeOverrides ? (
            <>
              {/* Simple left action (revealed on swipe right) */}
              <div ref={leftActionRef} style={simpleLeftActionStyle}>
                {swipeLeftAction?.icon ?? null}
              </div>
              {/* Simple right action (revealed on swipe left) */}
              <div ref={rightActionRef} style={simpleRightActionStyle}>
                {swipeRightAction?.icon ?? null}
              </div>
            </>
          ) : (
            <>
              {/* Left action background (favorite - revealed on swipe right) */}
              <div
                ref={leftActionRef}
                style={defaultLeftActionStyle}
              >
                <div style={shortSwipeLayerStyle}>
                  {isFavorited ? <Favorite style={iconStyle} /> : <FavoriteBorderOutlined style={iconStyle} />}
                </div>
                <div style={longSwipeLayerStyle}>
                  <LocalOfferOutlined style={iconStyle} />
                </div>
              </div>

              {/* Right action background (add to queue - revealed on swipe left) */}
              <div
                ref={rightActionRef}
                style={defaultRightActionStyle}
              >
                <AddOutlined style={iconStyle} />
              </div>
            </>
          )
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
              enableNavigation={!disableThumbnailNavigation}
            />
          </div>

          {/* Center + Right: Name, stars, setter, colorized grade */}
          <div style={centerStyle}>
            <ClimbTitle
              climb={climb}
              {...resolvedTitleProps}
            />
          </div>

          {/* After-title slot (e.g., avatar) */}
          {afterTitleSlot}

          {/* Menu: custom slot or default ellipsis button */}
          {menuSlot !== undefined ? menuSlot : (
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
          )}
        </div>
      </div>

      {/* Default actions drawers - only rendered when no menuSlot override */}
      {menuSlot === undefined && (
        <>
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
      )}
    </>
  );
}, (prev, next) => {
  return prev.climb.uuid === next.climb.uuid
    && prev.selected === next.selected
    && prev.unsupported === next.unsupported
    && prev.disableSwipe === next.disableSwipe
    && prev.boardDetails === next.boardDetails
    && prev.swipeLeftAction === next.swipeLeftAction
    && prev.swipeRightAction === next.swipeRightAction
    && prev.afterTitleSlot === next.afterTitleSlot
    && prev.menuSlot === next.menuSlot
    && prev.titleProps === next.titleProps
    && prev.backgroundColor === next.backgroundColor
    && prev.contentOpacity === next.contentOpacity
    && prev.disableThumbnailNavigation === next.disableThumbnailNavigation;
});

ClimbListItem.displayName = 'ClimbListItem';

export default ClimbListItem;
