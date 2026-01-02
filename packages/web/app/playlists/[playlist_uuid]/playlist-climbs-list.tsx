'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Row, Col, Empty, Typography } from 'antd';
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
import ClimbCard from '@/app/components/climb-card/climb-card';
import { ClimbCardSkeleton } from '@/app/components/board-page/board-page-skeleton';
import styles from './playlist-view.module.css';

const { Text } = Typography;

type PlaylistClimbsListProps = {
  playlistUuid: string;
  boardDetails: BoardDetails;
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
}: PlaylistClimbsListProps) {
  const { token, isLoading: tokenLoading } = useWsAuthToken();
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
    queryKey: ['playlistClimbs', playlistUuid, boardDetails.board_name, boardDetails.layout_id, boardDetails.size_id],
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
  const climbs: Climb[] = data?.pages.flatMap((page) => page.climbs as Climb[]) ?? [];
  const totalCount = data?.pages[0]?.totalCount ?? 0;

  // Intersection Observer callback for infinite scroll
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
        track('Playlist Infinite Scroll Load More', {
          playlistUuid,
          currentCount: climbs.length,
          hasMore: hasNextPage,
        });
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage, climbs.length, playlistUuid],
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

  // Handle climb selection
  const handleClimbClick = useCallback((climb: Climb) => {
    setSelectedClimbUuid(climb.uuid);
    track('Playlist Climb Card Clicked', {
      climbUuid: climb.uuid,
      playlistUuid,
    });
  }, [playlistUuid]);

  const aspectRatio = boardDetails.boardWidth / boardDetails.boardHeight;

  // Loading state
  if ((isLoading || tokenLoading) && climbs.length === 0) {
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

  // Empty state
  if (climbs.length === 0 && !isFetching) {
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

  return (
    <div className={styles.climbsSection}>
      <div className={styles.climbsSectionHeader}>
        <Text strong className={styles.climbsSectionTitle}>
          Climbs ({totalCount})
        </Text>
      </div>

      <Row gutter={[16, 16]}>
        {climbs.map((climb) => (
          <Col xs={24} lg={12} xl={12} key={climb.uuid}>
            <ClimbCard
              climb={climb}
              boardDetails={boardDetails}
              selected={selectedClimbUuid === climb.uuid}
              onCoverDoubleClick={() => handleClimbClick(climb)}
            />
          </Col>
        ))}
        {isFetching && climbs.length === 0 && (
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
        {!hasNextPage && climbs.length > 0 && (
          <div style={{ textAlign: 'center', padding: '20px', color: '#888' }}>
            {climbs.length === totalCount ? `All ${totalCount} climbs loaded` : 'No more climbs'}
          </div>
        )}
      </div>
    </div>
  );
}
