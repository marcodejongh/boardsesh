'use client';
import React, { useEffect, useCallback, useState, useMemo } from 'react';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import AppsOutlined from '@mui/icons-material/AppsOutlined';
import FormatListBulletedOutlined from '@mui/icons-material/FormatListBulletedOutlined';
import { track } from '@vercel/analytics';
import { Climb, BoardDetails } from '@/app/lib/types';
import ClimbCard from '../climb-card/climb-card';
import ClimbListItem from '../climb-card/climb-list-item';
import { ClimbCardSkeleton, ClimbListItemSkeleton } from './board-page-skeleton';
import { themeTokens } from '@/app/theme/theme-config';
import { getPreference, setPreference } from '@/app/lib/user-preferences-db';
import { useInfiniteScroll } from '@/app/hooks/use-infinite-scroll';

type ViewMode = 'grid' | 'list';

const VIEW_MODE_PREFERENCE_KEY = 'climbListViewMode';

export type ClimbsListProps = {
  boardDetails: BoardDetails;
  /** Map of "boardType:layoutId" -> BoardDetails for multi-board contexts */
  boardDetailsMap?: Record<string, BoardDetails>;
  /** Set of climb UUIDs that are unsupported (no matching user board) */
  unsupportedClimbs?: Set<string>;
  climbs: Climb[];
  selectedClimbUuid?: string | null;
  isFetching: boolean;
  hasMore: boolean;
  onClimbSelect?: (climb: Climb) => void;
  onLoadMore: () => void;
  header?: React.ReactNode;
  headerInline?: React.ReactNode;
  hideEndMessage?: boolean;
  /** Optional extra content to render below each climb item (e.g., per-user tick details in sessions) */
  renderItemExtra?: (climb: Climb) => React.ReactNode;
  /** When true, adds a bottom spacer to prevent the mobile Safari bottom nav bar from covering the last item */
  showBottomSpacer?: boolean;
};

const ClimbsListSkeleton = ({ aspectRatio, viewMode }: { aspectRatio: number; viewMode: ViewMode }) => {
  if (viewMode === 'list') {
    return Array.from({ length: 10 }, (_, i) => (
      <ClimbListItemSkeleton key={i} />
    ));
  }
  return Array.from({ length: 10 }, (_, i) => (
    <Box key={i} sx={{ width: { xs: '100%', lg: '50%' } }}>
      <ClimbCardSkeleton aspectRatio={aspectRatio} />
    </Box>
  ));
};

const ClimbsList = ({
  boardDetails,
  boardDetailsMap,
  unsupportedClimbs,
  climbs,
  selectedClimbUuid,
  isFetching,
  hasMore,
  onClimbSelect,
  onLoadMore,
  header,
  headerInline,
  hideEndMessage,
  renderItemExtra,
  showBottomSpacer,
}: ClimbsListProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Read stored view mode preference after mount to avoid hydration mismatch
  useEffect(() => {
    getPreference<ViewMode>(VIEW_MODE_PREFERENCE_KEY).then((stored) => {
      if (stored === 'grid' || stored === 'list') {
        setViewMode(stored);
      }
    });
  }, []);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    setPreference(VIEW_MODE_PREFERENCE_KEY, mode).catch(() => {});
    track('View Mode Changed', { mode });
  }, []);

  const handleLoadMore = useCallback(() => {
    track('Infinite Scroll Load More', {
      currentCount: climbs.length,
      hasMore,
    });
    onLoadMore();
  }, [climbs.length, hasMore, onLoadMore]);

  const { sentinelRef } = useInfiniteScroll({
    onLoadMore: handleLoadMore,
    hasMore,
    isFetching,
  });

  // Memoized handler for climb card double-click
  const handleClimbDoubleClick = useCallback(
    (climb: Climb) => {
      onClimbSelect?.(climb);
      track('Climb List Card Clicked', {
        climbUuid: climb.uuid,
      });
    },
    [onClimbSelect],
  );

  // Memoize climb-specific handlers to prevent unnecessary re-renders
  const climbHandlersMap = useMemo(() => {
    const map = new Map<string, () => void>();
    climbs.forEach(climb => {
      map.set(climb.uuid, () => handleClimbDoubleClick(climb));
    });
    return map;
  }, [climbs, handleClimbDoubleClick]);

  // Resolve per-climb boardDetails when boardDetailsMap is provided
  const resolveBoardDetails = useCallback(
    (climb: Climb): BoardDetails => {
      if (boardDetailsMap && climb.boardType && climb.layoutId != null) {
        const key = `${climb.boardType}:${climb.layoutId}`;
        return boardDetailsMap[key] || boardDetails;
      }
      return boardDetails;
    },
    [boardDetails, boardDetailsMap],
  );

  // Memoize sx prop objects to prevent recreation on every render
  const headerBoxSx = useMemo(() => ({
    display: 'flex',
    alignItems: 'center',
    position: 'relative' as const,
    padding: `${themeTokens.spacing[1]}px 60px ${themeTokens.spacing[2]}px ${themeTokens.spacing[1]}px`,
    minWidth: 0,
  }), []);

  const viewModeToggleBoxSx = useMemo(() => ({
    position: 'absolute' as const,
    right: `${themeTokens.spacing[1]}px`,
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'flex',
    gap: '2px',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: `${themeTokens.borderRadius.sm}px`,
    padding: '2px',
  }), []);

  const iconButtonSx = useMemo(() => ({ padding: '4px' }), []);

  const gridContainerSx = useMemo(() => ({
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: `${themeTokens.spacing[4]}px`,
  }), []);

  const cardBoxSx = useMemo(() => ({
    width: { xs: '100%', lg: `calc(50% - ${themeTokens.spacing[4] / 2}px)` },
  }), []);

  const sentinelBoxSx = useMemo(() => ({
    minHeight: `${themeTokens.spacing[5]}px`,
    mt: viewMode === 'grid' ? `${themeTokens.spacing[4]}px` : 0,
  }), [viewMode]);

  const noMoreClimbsBoxSx = useMemo(() => ({
    textAlign: 'center' as const,
    padding: `${themeTokens.spacing[5]}px`,
    color: 'var(--neutral-400)',
  }), []);

  return (
    <Box sx={{ pt: `${themeTokens.spacing[1]}px` }}>
      {/* Optional header content (e.g. BoardCreationBanner) */}
      {header}
      {/* View mode toggle + optional inline header content */}
      <Box sx={headerBoxSx}>
        {headerInline}
        <Box sx={viewModeToggleBoxSx}>
          <IconButton
            onClick={() => handleViewModeChange('list')}
            aria-label="List view"
            color={viewMode === 'list' ? 'primary' : 'default'}
            size="small"
            sx={iconButtonSx}
          >
            <FormatListBulletedOutlined fontSize="small" />
          </IconButton>
          <IconButton
            onClick={() => handleViewModeChange('grid')}
            aria-label="Grid view"
            color={viewMode === 'grid' ? 'primary' : 'default'}
            size="small"
            sx={iconButtonSx}
          >
            <AppsOutlined fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {viewMode === 'grid' ? (
        /* Grid (card) mode */
        <Box sx={gridContainerSx}>
          {climbs.map((climb, index) => (
            <Box key={climb.uuid} sx={cardBoxSx}>
              <div
                {...(index === 0 ? { id: 'onboarding-climb-card' } : {})}
              >
                <ClimbCard
                  climb={climb}
                  boardDetails={resolveBoardDetails(climb)}
                  selected={selectedClimbUuid === climb.uuid}
                  onCoverDoubleClick={climbHandlersMap.get(climb.uuid)}
                  unsupported={unsupportedClimbs?.has(climb.uuid)}
                />
              </div>
              {renderItemExtra?.(climb)}
            </Box>
          ))}
          {isFetching && (!climbs || climbs.length === 0) ? (
            <ClimbsListSkeleton aspectRatio={boardDetails.boardWidth / boardDetails.boardHeight} viewMode="grid" />
          ) : null}
        </Box>
      ) : (
        /* List (compact) mode */
        <div>
          {climbs.map((climb, index) => (
            <div
              key={climb.uuid}
              {...(index === 0 ? { id: 'onboarding-climb-card' } : {})}
            >
              <ClimbListItem
                climb={climb}
                boardDetails={resolveBoardDetails(climb)}
                selected={selectedClimbUuid === climb.uuid}
                onSelect={climbHandlersMap.get(climb.uuid)}
                unsupported={unsupportedClimbs?.has(climb.uuid)}
              />
              {renderItemExtra?.(climb)}
            </div>
          ))}
          {isFetching && (!climbs || climbs.length === 0) ? (
            <ClimbsListSkeleton aspectRatio={boardDetails.boardWidth / boardDetails.boardHeight} viewMode="list" />
          ) : null}
        </div>
      )}

      {/* Sentinel element for Intersection Observer - needs min-height to be observable */}
      <Box ref={sentinelRef} sx={sentinelBoxSx}>
        {isFetching && climbs.length > 0 && (
          viewMode === 'grid' ? (
            <Box sx={gridContainerSx}>
              <ClimbsListSkeleton aspectRatio={boardDetails.boardWidth / boardDetails.boardHeight} viewMode="grid" />
            </Box>
          ) : (
            <ClimbsListSkeleton aspectRatio={boardDetails.boardWidth / boardDetails.boardHeight} viewMode="list" />
          )
        )}
        {!hasMore && climbs.length > 0 && !hideEndMessage && (
          <Box sx={noMoreClimbsBoxSx}>
            No more climbs
          </Box>
        )}
      </Box>

      {/* Bottom spacer to prevent bottom nav bar from covering last item on mobile Safari */}
      {showBottomSpacer && (
        <Box sx={{ height: 'calc(80px + env(safe-area-inset-bottom, 0px))' }} aria-hidden />
      )}
    </Box>
  );
};

export default ClimbsList;
