'use client';
import React, { useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Climb, ParsedBoardRouteParameters, BoardDetails } from '@/app/lib/types';
import { useQueueContext } from '../graphql-queue';
import ClimbsList from './climbs-list';
import BoardCreationBanner from '../board-entity/board-creation-banner';
import RecentSearchPills from '../search-drawer/recent-search-pills';

type QueueClimbsListProps = ParsedBoardRouteParameters & {
  boardDetails: BoardDetails;
  initialClimbs: Climb[];
};

const QueueClimbsList = ({
  boardDetails,
  initialClimbs,
  board_name,
  layout_id,
  size_id,
  set_ids,
  angle,
}: QueueClimbsListProps) => {
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

  // Scroll to top when search params reset to page 0
  useEffect(() => {
    if (page === '0' && hasDoneFirstFetch && isFetchingClimbs) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [page, hasDoneFirstFetch, isFetchingClimbs]);

  // Queue Context provider uses React Query infinite to fetch results, which can only happen clientside.
  // That data equals null at the start, so when its null we use the initialClimbs array which we
  // fill on the server side in the page component. This way the user never sees a loading state for
  // the climb list.
  // Deduplicate climbs by uuid to prevent React key warnings during hydration/re-renders
  const climbs = useMemo(() => {
    const rawClimbs = !hasDoneFirstFetch ? initialClimbs : climbSearchResults || [];
    return rawClimbs.filter((climb, index, self) =>
      index === self.findIndex((c) => c.uuid === climb.uuid)
    );
  }, [hasDoneFirstFetch, initialClimbs, climbSearchResults]);

  const header = useMemo(() => (
    <BoardCreationBanner
      boardType={board_name}
      layoutId={layout_id}
      sizeId={size_id}
      setIds={set_ids.join(',')}
      angle={angle}
    />
  ), [board_name, layout_id, size_id, set_ids, angle]);

  const headerInline = useMemo(() => <RecentSearchPills />, []);

  return (
    <ClimbsList
      boardDetails={boardDetails}
      climbs={climbs}
      selectedClimbUuid={currentClimb?.uuid}
      isFetching={isFetchingClimbs}
      hasMore={hasMoreResults}
      onClimbSelect={setCurrentClimb}
      onLoadMore={fetchMoreClimbs}
      header={header}
      headerInline={headerInline}
    />
  );
};

export default QueueClimbsList;
