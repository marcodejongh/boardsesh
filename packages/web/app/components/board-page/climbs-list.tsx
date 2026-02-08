'use client';
import React, { useEffect, useRef, useCallback, useState } from 'react';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import AppsOutlined from '@mui/icons-material/AppsOutlined';
import FormatListBulletedOutlined from '@mui/icons-material/FormatListBulletedOutlined';
import { track } from '@vercel/analytics';
import { Climb, ParsedBoardRouteParameters, BoardDetails } from '@/app/lib/types';
import { useQueueContext } from '../graphql-queue';
import ClimbCard from '../climb-card/climb-card';
import ClimbListItem from '../climb-card/climb-list-item';
import { ClimbCardSkeleton, ClimbListItemSkeleton } from './board-page-skeleton';
import { useSearchParams } from 'next/navigation';
import { themeTokens } from '@/app/theme/theme-config';
import RecentSearchPills from '../search-drawer/recent-search-pills';

type ViewMode = 'grid' | 'list';

const VIEW_MODE_STORAGE_KEY = 'climbListViewMode';

type ClimbsListProps = ParsedBoardRouteParameters & {
  boardDetails: BoardDetails;
  initialClimbs: Climb[];
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

const ClimbsList = ({ boardDetails, initialClimbs }: ClimbsListProps) => {
  const {
    setCurrentClimb,
    climbSearchResults,
    hasMoreResults,
    fetchMoreClimbs,
    currentClimb,
    hasDoneFirstFetch,
    isFetchingClimbs,
  } = useQueueContext();

  const searchParams = useSearchParams();
  const page = searchParams.get('page');
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Read stored view mode preference after mount to avoid hydration mismatch
  useEffect(() => {
    try {
      const stored = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      if (stored === 'grid' || stored === 'list') {
        setViewMode(stored);
      }
    } catch {
      // localStorage not available
    }
  }, []);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
    } catch {
      // localStorage not available
    }
    track('View Mode Changed', { mode });
  }, []);

  // Queue Context provider uses React Query infinite to fetch results, which can only happen clientside.
  // That data equals null at the start, so when its null we use the initialClimbs array which we
  // fill on the server side in the page component. This way the user never sees a loading state for
  // the climb list.
  // Deduplicate climbs by uuid to prevent React key warnings during hydration/re-renders
  const rawClimbs = !hasDoneFirstFetch ? initialClimbs : climbSearchResults || [];
  const climbs = rawClimbs.filter((climb, index, self) =>
    index === self.findIndex((c) => c.uuid === climb.uuid)
  );

  // Ref for the intersection observer sentinel element
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (page === '0' && hasDoneFirstFetch && isFetchingClimbs) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [page, hasDoneFirstFetch, isFetchingClimbs]);

  // Intersection Observer callback for infinite scroll
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && hasMoreResults) {
        track('Infinite Scroll Load More', {
          currentCount: climbs.length,
          hasMore: hasMoreResults,
        });
        fetchMoreClimbs();
      }
    },
    [hasMoreResults, fetchMoreClimbs, climbs.length],
  );

  // Memoized handler for climb card double-click
  const handleClimbDoubleClick = useCallback(
    (climb: Climb) => {
      setCurrentClimb(climb);
      track('Climb List Card Clicked', {
        climbUuid: climb.uuid,
      });
    },
    [setCurrentClimb],
  );

  // Set up Intersection Observer
  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: '100px',
      threshold: 0,
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [handleObserver]);

  return (
    <div style={{ paddingTop: themeTokens.spacing[1] }}>
      {/* View mode toggle + recent searches */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: themeTokens.spacing[2],
          padding: `${themeTokens.spacing[1]}px ${themeTokens.spacing[1]}px ${themeTokens.spacing[2]}px`,
          minWidth: 0,
        }}
      >
        <RecentSearchPills />
        <ButtonGroup size="small" sx={{ flexShrink: 0 }}>
          <IconButton
            onClick={() => handleViewModeChange('list')}
            aria-label="List view"
            color={viewMode === 'list' ? 'primary' : 'default'}
            size="small"
          >
            <FormatListBulletedOutlined />
          </IconButton>
          <IconButton
            onClick={() => handleViewModeChange('grid')}
            aria-label="Grid view"
            color={viewMode === 'grid' ? 'primary' : 'default'}
            size="small"
          >
            <AppsOutlined />
          </IconButton>
        </ButtonGroup>
      </Box>

      {viewMode === 'grid' ? (
        /* Grid (card) mode */
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: `${themeTokens.spacing[4]}px` }}>
          {climbs.map((climb, index) => (
            <Box key={climb.uuid} sx={{ width: { xs: '100%', lg: '50%' } }}>
              <div
                {...(index === 0 ? { id: 'onboarding-climb-card' } : {})}
              >
                <ClimbCard
                  climb={climb}
                  boardDetails={boardDetails}
                  selected={currentClimb?.uuid === climb.uuid}
                  onCoverDoubleClick={() => handleClimbDoubleClick(climb)}
                />
              </div>
            </Box>
          ))}
          {isFetchingClimbs && (!climbs || climbs.length === 0) ? (
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
                boardDetails={boardDetails}
                selected={currentClimb?.uuid === climb.uuid}
                onSelect={() => handleClimbDoubleClick(climb)}
              />
            </div>
          ))}
          {isFetchingClimbs && (!climbs || climbs.length === 0) ? (
            <ClimbsListSkeleton aspectRatio={boardDetails.boardWidth / boardDetails.boardHeight} viewMode="list" />
          ) : null}
        </div>
      )}

      {/* Sentinel element for Intersection Observer - needs min-height to be observable */}
      <div ref={loadMoreRef} style={{ minHeight: themeTokens.spacing[5], marginTop: viewMode === 'grid' ? themeTokens.spacing[4] : 0 }}>
        {isFetchingClimbs && climbs.length > 0 && (
          viewMode === 'grid' ? (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: `${themeTokens.spacing[4]}px` }}>
              <ClimbsListSkeleton aspectRatio={boardDetails.boardWidth / boardDetails.boardHeight} viewMode="grid" />
            </Box>
          ) : (
            <ClimbsListSkeleton aspectRatio={boardDetails.boardWidth / boardDetails.boardHeight} viewMode="list" />
          )
        )}
        {!hasMoreResults && climbs.length > 0 && (
          <div style={{ textAlign: 'center', padding: themeTokens.spacing[5], color: themeTokens.neutral[400] }}>
            No more climbs
          </div>
        )}
      </div>
    </div>
  );
};

export default ClimbsList;
