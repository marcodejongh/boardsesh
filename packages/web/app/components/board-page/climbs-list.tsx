'use client';
import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Row, Col, Button, Flex } from 'antd';
import { AppstoreOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { track } from '@vercel/analytics';
import { Climb, ParsedBoardRouteParameters, BoardDetails } from '@/app/lib/types';
import { useQueueContext } from '../graphql-queue';
import ClimbCard from '../climb-card/climb-card';
import ClimbListItem from '../climb-card/climb-list-item';
import { ClimbCardSkeleton, ClimbListItemSkeleton } from './board-page-skeleton';
import { useSearchParams } from 'next/navigation';
import { themeTokens } from '@/app/theme/theme-config';

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
    <Col xs={24} lg={12} xl={12} key={i}>
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
      const scrollContainer = document.getElementById('content-for-scrollable');
      if (scrollContainer) {
        scrollContainer.scrollTo({ top: 0, behavior: 'instant' });
      }
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
    <div style={{ paddingTop: themeTokens.spacing[1] }}>
      {/* View mode toggle */}
      <Flex
        justify="flex-end"
        style={{
          padding: `${themeTokens.spacing[1]}px ${themeTokens.spacing[1]}px ${themeTokens.spacing[2]}px`,
        }}
      >
        <Button.Group size="small">
          <Button
            icon={<UnorderedListOutlined />}
            type={viewMode === 'list' ? 'primary' : 'default'}
            onClick={() => handleViewModeChange('list')}
            aria-label="List view"
          />
          <Button
            icon={<AppstoreOutlined />}
            type={viewMode === 'grid' ? 'primary' : 'default'}
            onClick={() => handleViewModeChange('grid')}
            aria-label="Grid view"
          />
        </Button.Group>
      </Flex>

      {viewMode === 'grid' ? (
        /* Grid (card) mode */
        <Row gutter={[themeTokens.spacing[4], themeTokens.spacing[4]]}>
          {climbs.map((climb, index) => (
            <Col xs={24} lg={12} xl={12} key={climb.uuid}>
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
            </Col>
          ))}
          {isFetchingClimbs && (!climbs || climbs.length === 0) ? (
            <ClimbsListSkeleton aspectRatio={boardDetails.boardWidth / boardDetails.boardHeight} viewMode="grid" />
          ) : null}
        </Row>
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
            <Row gutter={[themeTokens.spacing[4], themeTokens.spacing[4]]}>
              <ClimbsListSkeleton aspectRatio={boardDetails.boardWidth / boardDetails.boardHeight} viewMode="grid" />
            </Row>
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
