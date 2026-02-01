'use client';
import React, { useEffect, useRef, useCallback } from 'react';
import { Row, Col } from 'antd';
import { track } from '@vercel/analytics';
import { Climb, ParsedBoardRouteParameters, BoardDetails } from '@/app/lib/types';
import { useQueueContext } from '../graphql-queue';
import ClimbCard from '../climb-card/climb-card';
import { ClimbCardSkeleton } from './board-page-skeleton';
import { useSearchParams } from 'next/navigation';
import styles from './climbs-list.module.css';

type ClimbsListProps = ParsedBoardRouteParameters & {
  boardDetails: BoardDetails;
  initialClimbs: Climb[];
};

const ClimbsListSkeleton = ({ aspectRatio }: { aspectRatio: number }) => {
  return Array.from({ length: 10 }, (_, i) => (
    <Col key={i} className={styles.climbCol}>
      <ClimbCardSkeleton aspectRatio={aspectRatio} />
    </Col>
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
  // Deduplicate climbs by uuid to prevent React key warnings during hydration/re-renders
  const rawClimbs = !hasDoneFirstFetch ? initialClimbs : climbSearchResults || [];
  const climbs = rawClimbs.filter((climb, index, self) =>
    index === self.findIndex((c) => c.uuid === climb.uuid)
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

  // Memoized handler for climb card double-click
  const handleClimbDoubleClick = useCallback(
    (climb: Climb) => {
      updateHash(climb.uuid);
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
          <Col id={climb.uuid} key={climb.uuid} className={styles.climbCol}>
            <div
              ref={(el) => {
                climbsRefs.current[climb.uuid] = el;
              }}
            >
              <ClimbCard
                climb={climb}
                boardDetails={boardDetails}
                selected={currentClimb?.uuid === climb.uuid}
                onCoverDoubleClick={() => handleClimbDoubleClick(climb)}
              />
            </div>
          </Col>
        ))}
        {isFetchingClimbs && (!climbs || climbs.length === 0) ? (
          <ClimbsListSkeleton aspectRatio={boardDetails.boardWidth / boardDetails.boardHeight} />
        ) : null}
      </Row>

      {/* Sentinel element for Intersection Observer - needs min-height to be observable */}
      <div ref={loadMoreRef} style={{ minHeight: '20px', marginTop: '16px' }}>
        {isFetchingClimbs && climbs.length > 0 && (
          <Row gutter={[16, 16]}>
            <ClimbsListSkeleton aspectRatio={boardDetails.boardWidth / boardDetails.boardHeight} />
          </Row>
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
