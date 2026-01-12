'use client';

import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { Row, Col, Empty, Typography, Alert } from 'antd';
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
import { ClimbCardSkeleton } from '@/app/components/board-page/board-page-skeleton';
import styles from './playlist-view.module.css';

const { Text } = Typography;

type PlaylistClimbsListProps = {
  playlistUuid: string;
  boardDetails: BoardDetails;
  angle: number;
};

const ClimbsListSkeleton = ({ aspectRatio }: { aspectRatio: number }) => {
  return (
    <>
      {Array.from({ length: 6 }, (_, i) => (
        <Col xs={24} lg={12} xl={12} key={i}>
          <ClimbCardSkeleton aspectRatio={aspectRatio} />
        </Col>
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
        // Use the route angle instead of the climb's stored angle
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

    const scrollContainer = document.getElementById('content-for-scrollable');

    const observer = new IntersectionObserver(handleObserver, {
      root: scrollContainer,
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

  const aspectRatio = boardDetails.boardWidth / boardDetails.boardHeight;

  // Loading state
  if ((isLoading || tokenLoading) && allClimbs.length === 0) {
    return (
      <div className={styles.climbsSection}>
        <div className={styles.climbsSectionHeader}>
          <Text strong className={styles.climbsSectionTitle}>Climbs</Text>
        </div>
        <Row gutter={[16, 16]}>
          <ClimbsListSkeleton aspectRatio={aspectRatio} />
        </Row>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles.climbsSection}>
        <div className={styles.climbsSectionHeader}>
          <Text strong className={styles.climbsSectionTitle}>Climbs</Text>
        </div>
        <Empty
          description="Failed to load climbs"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </div>
    );
  }

  // Empty state (considering both visible and hidden climbs)
  if (visibleClimbs.length === 0 && hiddenCount === 0 && !isFetching) {
    return (
      <div className={styles.climbsSection}>
        <div className={styles.climbsSectionHeader}>
          <Text strong className={styles.climbsSectionTitle}>Climbs</Text>
        </div>
        <Empty
          description="No climbs in this playlist yet"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </div>
    );
  }

  // Calculate visible count for display
  const visibleCount = visibleClimbs.length;

  return (
    <div className={styles.climbsSection}>
      <div className={styles.climbsSectionHeader}>
        <Text strong className={styles.climbsSectionTitle}>
          Climbs ({visibleCount})
        </Text>
      </div>

      {/* Notice for hidden cross-layout climbs */}
      {hiddenCount > 0 && (
        <Alert
          type="info"
          showIcon
          title={`Not showing ${hiddenCount} ${hiddenCount === 1 ? 'climb' : 'climbs'} from other layouts`}
          className={styles.hiddenClimbsNotice}
        />
      )}

      {/* Empty state when all climbs are from other layouts */}
      {visibleClimbs.length === 0 && hiddenCount > 0 && !isFetching && (
        <Empty
          description="All climbs in this playlist are from other layouts"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      )}

      <Row gutter={[16, 16]}>
        {visibleClimbs.map((climb) => (
          <Col xs={24} lg={12} xl={12} key={climb.uuid}>
            <ClimbCard
              climb={climb}
              boardDetails={boardDetails}
              selected={selectedClimbUuid === climb.uuid}
              onCoverDoubleClick={() => handleClimbDoubleClick(climb)}
            />
          </Col>
        ))}
        {isFetching && allClimbs.length === 0 && (
          <ClimbsListSkeleton aspectRatio={aspectRatio} />
        )}
      </Row>

      {/* Sentinel element for Intersection Observer */}
      <div ref={loadMoreRef} style={{ minHeight: '20px', marginTop: '16px' }}>
        {isFetchingNextPage && (
          <Row gutter={[16, 16]}>
            <ClimbsListSkeleton aspectRatio={aspectRatio} />
          </Row>
        )}
        {!hasNextPage && visibleClimbs.length > 0 && (
          <div style={{ textAlign: 'center', padding: '20px', color: '#888' }}>
            {allClimbs.length >= totalCount ? `All ${visibleCount} climbs loaded` : 'No more climbs'}
          </div>
        )}
      </div>
    </div>
  );
}
