'use client';
import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { Row, Col } from 'antd';
import AnimatedBoardLoading from '../loading/animated-board-loading';
import { track } from '@vercel/analytics';
import { Climb, ParsedBoardRouteParameters, BoardDetails } from '@/app/lib/types';
import { useQueueContext } from '../graphql-queue';
import ClimbCard from '../climb-card/climb-card';
import { PlusCircleOutlined, FireOutlined } from '@ant-design/icons';
import { useSearchParams } from 'next/navigation';
import { useFavoritesBatch } from '../climb-actions';

type ClimbsListProps = ParsedBoardRouteParameters & {
  boardDetails: BoardDetails;
  initialClimbs: Climb[];
};

const ClimbCardSkeletons = ({ boardDetails, id }: { boardDetails: BoardDetails; id: number }) => {
  return (
    <Col xs={24} lg={12} xl={12} key={id.toString()}>
      <ClimbCard
        key={id.toString()}
        boardDetails={boardDetails}
        actions={[<PlusCircleOutlined key="plus" />, <FireOutlined key="fire" />]}
      />
    </Col>
  );
};

const ClimbsListSkeleton = ({ boardDetails }: { boardDetails: BoardDetails }) => {
  return Array.from({ length: 10 }, (_, i) => i + 1).map((val) => (
    <ClimbCardSkeletons id={val} key={val.toString()} boardDetails={boardDetails} />
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

  // Queue Context provider uses React Query infinite to fetch results, which can only happen clientside.
  // That data equals null at the start, so when its null we use the initialClimbs array which we
  // fill on the server side in the page component. This way the user never sees a loading state for
  // the climb list.
  const climbs = !hasDoneFirstFetch ? initialClimbs : climbSearchResults || [];

  // Batch fetch favorites for all visible climbs
  const climbUuids = useMemo(() => climbs.map((c) => c.uuid), [climbs]);
  const { favorites, refetch: refetchFavorites } = useFavoritesBatch({
    boardName: boardDetails.board_name,
    climbUuids,
    angle: boardDetails.angle,
  });

  // Local optimistic state for favorites to avoid waiting for refetch
  const [optimisticFavorites, setOptimisticFavorites] = useState<Set<string>>(new Set());
  const [optimisticUnfavorites, setOptimisticUnfavorites] = useState<Set<string>>(new Set());

  // Combined favorites: server state + optimistic adds - optimistic removes
  const effectiveFavorites = useMemo(() => {
    const result = new Set(favorites);
    optimisticFavorites.forEach((uuid) => result.add(uuid));
    optimisticUnfavorites.forEach((uuid) => result.delete(uuid));
    return result;
  }, [favorites, optimisticFavorites, optimisticUnfavorites]);

  // Handle favorite toggle with optimistic update
  const handleFavoriteToggle = useCallback(
    (climbUuid: string, newState: boolean) => {
      if (newState) {
        setOptimisticFavorites((prev) => new Set(prev).add(climbUuid));
        setOptimisticUnfavorites((prev) => {
          const next = new Set(prev);
          next.delete(climbUuid);
          return next;
        });
      } else {
        setOptimisticUnfavorites((prev) => new Set(prev).add(climbUuid));
        setOptimisticFavorites((prev) => {
          const next = new Set(prev);
          next.delete(climbUuid);
          return next;
        });
      }
      // Refetch to sync with server after a short delay
      setTimeout(() => {
        refetchFavorites();
        // Clear optimistic state after refetch
        setOptimisticFavorites(new Set());
        setOptimisticUnfavorites(new Set());
      }, 1000);
    },
    [refetchFavorites],
  );

  // A ref to store each climb's DOM element position for easier scroll tracking
  const climbsRefs = useRef<{ [uuid: string]: HTMLDivElement | null }>({});

  // Ref for the intersection observer sentinel element
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const updateHash = (climbId: string) => {
    history.replaceState(null, '', `#${climbId}`);
  };

  // Function to restore scroll based on the hash in the URL
  const restoreScrollFromHash = () => {
    const hash = window.location.hash;
    if (hash) {
      const climbId = hash.substring(1);
      const climbElement = document.getElementById(climbId);

      if (climbElement) {
        climbElement.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    }
  };

  // When the component mounts, restore the scroll position based on the hash
  useEffect(() => {
    restoreScrollFromHash();
  }, []);

  useEffect(() => {
    if (page === '0' && hasDoneFirstFetch && isFetchingClimbs) {
      const scrollContainer = document.getElementById('content-for-scrollable');
      if (scrollContainer) {
        scrollContainer.scrollTo({ top: 0, behavior: 'instant' });
      }
      climbsRefs.current = {};
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

  return (
    <div style={{ paddingTop: '5px' }}>
      <Row gutter={[16, 16]}>
        {climbs.map((climb) => (
          <Col xs={24} lg={12} xl={12} id={climb.uuid} key={climb.uuid}>
            <div
              ref={(el) => {
                climbsRefs.current[climb.uuid] = el;
              }}
            >
              <ClimbCard
                climb={climb}
                boardDetails={boardDetails}
                selected={currentClimb?.uuid === climb.uuid}
                isFavorited={effectiveFavorites.has(climb.uuid)}
                onFavoriteToggle={handleFavoriteToggle}
                onCoverClick={() => {
                  updateHash(climb.uuid);
                  setCurrentClimb(climb);
                  track('Climb List Card Clicked', {
                    climbUuid: climb.uuid,
                  });
                }}
              />
            </div>
          </Col>
        ))}
        {isFetchingClimbs && (!climbs || climbs.length === 0) ? (
          <ClimbsListSkeleton boardDetails={boardDetails} />
        ) : null}
      </Row>

      {/* Sentinel element for Intersection Observer */}
      <div ref={loadMoreRef} style={{ height: '20px', marginTop: '16px' }}>
        {isFetchingClimbs && climbs.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
            <AnimatedBoardLoading isVisible={true} boardDetails={boardDetails} inline />
          </div>
        )}
        {!hasMoreResults && climbs.length > 0 && (
          <div style={{ textAlign: 'center', padding: '20px', color: '#888' }}>
            No more climbs 🤐
          </div>
        )}
      </div>
    </div>
  );
};

export default ClimbsList;
