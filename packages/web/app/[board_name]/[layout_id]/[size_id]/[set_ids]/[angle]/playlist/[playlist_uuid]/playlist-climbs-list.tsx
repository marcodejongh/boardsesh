'use client';

import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import MuiAlert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import { FormatListBulletedOutlined, AppsOutlined } from '@mui/icons-material';
import { useInfiniteQuery } from '@tanstack/react-query';
import { track } from '@vercel/analytics';
import { Climb, BoardDetails } from '@/app/lib/types';
import { executeGraphQL } from '@/app/lib/graphql/client';
import {
  GET_PLAYLIST_CLIMBS,
  GetPlaylistClimbsQueryResponse,
  GetPlaylistClimbsQueryVariables,
} from '@/app/lib/graphql/operations/playlists';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { useQueueContext } from '@/app/components/graphql-queue';
import ClimbCard from '@/app/components/climb-card/climb-card';
import ClimbListItem from '@/app/components/climb-card/climb-list-item';
import { ClimbCardSkeleton } from '@/app/components/board-page/board-page-skeleton';
import { EmptyState } from '@/app/components/ui/empty-state';
import { getPreference, setPreference } from '@/app/lib/user-preferences-db';
import styles from './playlist-view.module.css';

type ViewMode = 'grid' | 'list';

type PlaylistClimbsListProps = {
  playlistUuid: string;
  boardDetails: BoardDetails;
  angle: number;
};

// Memoized sx prop for skeleton cards
const skeletonCardBoxSx = { width: { xs: '100%', lg: '50%' } };

const ClimbsListSkeleton = ({ aspectRatio }: { aspectRatio: number }) => {
  return (
    <>
      {Array.from({ length: 6 }, (_, i) => (
        <Box sx={skeletonCardBoxSx} key={i}>
          <ClimbCardSkeleton aspectRatio={aspectRatio} />
        </Box>
      ))}
    </>
  );
};

export default function PlaylistClimbsList({
  playlistUuid,
  boardDetails,
  angle,
}: PlaylistClimbsListProps) {
  const { token, isLoading: tokenLoading } = useWsAuthToken();
  const { setCurrentClimb } = useQueueContext();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [selectedClimbUuid, setSelectedClimbUuid] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Load saved view mode preference
  useEffect(() => {
    getPreference<ViewMode>('playlistClimbListViewMode').then((saved) => {
      if (saved) setViewMode(saved);
    });
  }, []);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    setPreference('playlistClimbListViewMode', mode);
    track('Playlist View Mode Changed', { mode, playlistUuid });
  }, [playlistUuid]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery({
    queryKey: ['playlistClimbs', playlistUuid, boardDetails.board_name, boardDetails.layout_id, boardDetails.size_id, angle],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await executeGraphQL<
        GetPlaylistClimbsQueryResponse,
        GetPlaylistClimbsQueryVariables
      >(
        GET_PLAYLIST_CLIMBS,
        {
          input: {
            playlistId: playlistUuid,
            boardName: boardDetails.board_name,
            layoutId: boardDetails.layout_id,
            sizeId: boardDetails.size_id,
            setIds: boardDetails.set_ids.join(','),
            angle: angle,
            page: pageParam,
            pageSize: 20,
          },
        },
        token,
      );
      return response.playlistClimbs;
    },
    enabled: !tokenLoading && !!token,
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined;
      return allPages.length;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Flatten all pages of climbs
  const allClimbs: Climb[] = data?.pages.flatMap((page) => page.climbs as Climb[]) ?? [];
  const totalCount = data?.pages[0]?.totalCount ?? 0;

  // Filter out cross-layout climbs, count how many are hidden, and update angle to route angle
  const { visibleClimbs, hiddenCount } = useMemo(() => {
    const visible: Climb[] = [];
    let hidden = 0;

    for (const climb of allClimbs) {
      const isCrossLayout = climb.layoutId != null && climb.layoutId !== boardDetails.layout_id;
      if (isCrossLayout) {
        hidden++;
      } else {
        visible.push({ ...climb, angle });
      }
    }

    return { visibleClimbs: visible, hiddenCount: hidden };
  }, [allClimbs, boardDetails.layout_id, angle]);

  // Intersection Observer callback for infinite scroll
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
        track('Playlist Infinite Scroll Load More', {
          playlistUuid,
          currentCount: allClimbs.length,
          hasMore: hasNextPage,
        });
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage, allClimbs.length, playlistUuid],
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

  // Handle climb double-click - add to queue and make it the active climb
  const handleClimbDoubleClick = useCallback((climb: Climb) => {
    setSelectedClimbUuid(climb.uuid);
    setCurrentClimb(climb);
    track('Playlist Climb Card Double Clicked', {
      climbUuid: climb.uuid,
      playlistUuid,
      angle: climb.angle,
    });
  }, [playlistUuid, setCurrentClimb]);

  // Memoize climb-specific handlers to prevent unnecessary re-renders
  const climbHandlersMap = useMemo(() => {
    const map = new Map<string, () => void>();
    visibleClimbs.forEach(climb => {
      map.set(climb.uuid, () => handleClimbDoubleClick(climb));
    });
    return map;
  }, [visibleClimbs, handleClimbDoubleClick]);

  // Memoize inline style objects
  const sentinelStyle = useMemo(
    () => ({ minHeight: '20px', marginTop: '16px' }),
    [],
  );

  // Memoize sx prop objects to prevent recreation on every render
  const gridContainerSx = useMemo(() => ({
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '16px',
  }), []);

  const cardBoxSx = useMemo(() => ({
    width: { xs: '100%', lg: '50%' },
  }), []);

  const aspectRatio = boardDetails.boardWidth / boardDetails.boardHeight;

  // Loading state
  if ((isLoading || tokenLoading) && allClimbs.length === 0) {
    return (
      <div className={styles.climbsSection}>
        <Box sx={gridContainerSx}>
          <ClimbsListSkeleton aspectRatio={aspectRatio} />
        </Box>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles.climbsSection}>
        <EmptyState description="Failed to load climbs" />
      </div>
    );
  }

  // Empty state (considering both visible and hidden climbs)
  if (visibleClimbs.length === 0 && hiddenCount === 0 && !isFetching) {
    return (
      <div className={styles.climbsSection}>
        <EmptyState description="No climbs in this playlist yet" />
      </div>
    );
  }

  return (
    <div className={styles.climbsSection}>
      {/* View Mode Toggle */}
      <div className={styles.viewModeToggle}>
        <IconButton
          size="small"
          color={viewMode === 'list' ? 'primary' : 'default'}
          onClick={() => handleViewModeChange('list')}
          aria-label="List view"
        >
          <FormatListBulletedOutlined />
        </IconButton>
        <IconButton
          size="small"
          color={viewMode === 'grid' ? 'primary' : 'default'}
          onClick={() => handleViewModeChange('grid')}
          aria-label="Grid view"
        >
          <AppsOutlined />
        </IconButton>
      </div>

      {/* Notice for hidden cross-layout climbs */}
      {hiddenCount > 0 && (
        <MuiAlert severity="info" className={styles.hiddenClimbsNotice}>
          {`Not showing ${hiddenCount} ${hiddenCount === 1 ? 'climb' : 'climbs'} from other layouts`}
        </MuiAlert>
      )}

      {/* Empty state when all climbs are from other layouts */}
      {visibleClimbs.length === 0 && hiddenCount > 0 && !isFetching && (
        <EmptyState description="All climbs in this playlist are from other layouts" />
      )}

      {viewMode === 'grid' ? (
        <Box sx={gridContainerSx}>
          {visibleClimbs.map((climb) => (
            <Box sx={cardBoxSx} key={climb.uuid}>
              <ClimbCard
                climb={climb}
                boardDetails={boardDetails}
                selected={selectedClimbUuid === climb.uuid}
                onCoverDoubleClick={climbHandlersMap.get(climb.uuid)}
              />
            </Box>
          ))}
          {isFetching && allClimbs.length === 0 && (
            <ClimbsListSkeleton aspectRatio={aspectRatio} />
          )}
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          {visibleClimbs.map((climb) => (
            <ClimbListItem
              key={climb.uuid}
              climb={climb}
              boardDetails={boardDetails}
              selected={selectedClimbUuid === climb.uuid}
              onSelect={climbHandlersMap.get(climb.uuid)}
            />
          ))}
        </Box>
      )}

      {/* Sentinel element for Intersection Observer */}
      <div ref={loadMoreRef} style={sentinelStyle}>
        {isFetchingNextPage && (
          <Box sx={gridContainerSx}>
            <ClimbsListSkeleton aspectRatio={aspectRatio} />
          </Box>
        )}
        {!hasNextPage && visibleClimbs.length > 0 && (
          <div className={styles.endOfList}>
            {allClimbs.length >= totalCount ? `All ${visibleClimbs.length} climbs loaded` : 'No more climbs'}
          </div>
        )}
      </div>
    </div>
  );
}
