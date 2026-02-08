'use client';

import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import { FormatListBulletedOutlined, AppsOutlined } from '@mui/icons-material';
import { useInfiniteQuery } from '@tanstack/react-query';
import { track } from '@vercel/analytics';
import { Climb, BoardDetails } from '@/app/lib/types';
import { executeGraphQL } from '@/app/lib/graphql/client';
import {
  GET_USER_FAVORITE_CLIMBS,
  GetUserFavoriteClimbsQueryResponse,
  GetUserFavoriteClimbsQueryVariables,
} from '@/app/lib/graphql/operations/favorites';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { useQueueContext } from '@/app/components/graphql-queue';
import ClimbCard from '@/app/components/climb-card/climb-card';
import ClimbListItem from '@/app/components/climb-card/climb-list-item';
import { ClimbCardSkeleton } from '@/app/components/board-page/board-page-skeleton';
import { EmptyState } from '@/app/components/ui/empty-state';
import { getPreference, setPreference } from '@/app/lib/user-preferences-db';
import styles from '../playlist/[playlist_uuid]/playlist-view.module.css';

type ViewMode = 'grid' | 'list';

type LikedClimbsListProps = {
  boardDetails: BoardDetails;
  angle: number;
};

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

export default function LikedClimbsList({
  boardDetails,
  angle,
}: LikedClimbsListProps) {
  const { token, isLoading: tokenLoading } = useWsAuthToken();
  const { setCurrentClimb } = useQueueContext();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [selectedClimbUuid, setSelectedClimbUuid] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  useEffect(() => {
    getPreference<ViewMode>('likedClimbsViewMode').then((saved) => {
      if (saved) setViewMode(saved);
    });
  }, []);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    setPreference('likedClimbsViewMode', mode);
    track('Liked Climbs View Mode Changed', { mode });
  }, []);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery({
    queryKey: ['likedClimbs', boardDetails.board_name, boardDetails.layout_id, boardDetails.size_id, angle],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await executeGraphQL<
        GetUserFavoriteClimbsQueryResponse,
        GetUserFavoriteClimbsQueryVariables
      >(
        GET_USER_FAVORITE_CLIMBS,
        {
          input: {
            boardName: boardDetails.board_name,
            layoutId: boardDetails.layout_id,
            sizeId: boardDetails.size_id,
            setIds: boardDetails.set_ids.join(','),
            angle,
            page: pageParam,
            pageSize: 20,
          },
        },
        token,
      );
      return response.userFavoriteClimbs;
    },
    enabled: !tokenLoading && !!token,
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined;
      return allPages.length;
    },
    staleTime: 5 * 60 * 1000,
  });

  const allClimbs: Climb[] = data?.pages.flatMap((page) => page.climbs as Climb[]) ?? [];
  const totalCount = data?.pages[0]?.totalCount ?? 0;

  // Show all liked climbs regardless of layout (unlike playlists, favorites span all layouts)
  const visibleClimbs: Climb[] = useMemo(() => {
    return allClimbs.map((climb) => ({ ...climb, angle }));
  }, [allClimbs, angle]);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
        track('Liked Climbs Infinite Scroll Load More', {
          currentCount: allClimbs.length,
          hasMore: hasNextPage,
        });
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage, allClimbs.length],
  );

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

  const handleClimbDoubleClick = useCallback((climb: Climb) => {
    setSelectedClimbUuid(climb.uuid);
    setCurrentClimb(climb);
    track('Liked Climb Card Double Clicked', {
      climbUuid: climb.uuid,
      angle: climb.angle,
    });
  }, [setCurrentClimb]);

  const climbHandlersMap = useMemo(() => {
    const map = new Map<string, () => void>();
    visibleClimbs.forEach(climb => {
      map.set(climb.uuid, () => handleClimbDoubleClick(climb));
    });
    return map;
  }, [visibleClimbs, handleClimbDoubleClick]);

  const sentinelStyle = useMemo(
    () => ({ minHeight: '20px', marginTop: '16px' }),
    [],
  );

  const gridContainerSx = useMemo(() => ({
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '16px',
  }), []);

  const cardBoxSx = useMemo(() => ({
    width: { xs: '100%', lg: '50%' },
  }), []);

  const aspectRatio = boardDetails.boardWidth / boardDetails.boardHeight;

  if ((isLoading || tokenLoading) && allClimbs.length === 0) {
    return (
      <div className={styles.climbsSection}>
        <Box sx={gridContainerSx}>
          <ClimbsListSkeleton aspectRatio={aspectRatio} />
        </Box>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.climbsSection}>
        <EmptyState description="Failed to load liked climbs" />
      </div>
    );
  }

  if (visibleClimbs.length === 0 && !isFetching) {
    return (
      <div className={styles.climbsSection}>
        <EmptyState description="No liked climbs yet. Heart some climbs to see them here!" />
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
