import { useCallback, useRef, useEffect, useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { PAGE_LIMIT } from '../../board-page/constants';
import { ClimbQueue } from '../types';
import { ParsedBoardRouteParameters, SearchRequestPagination, SearchClimbsResult } from '@/app/lib/types';
import { useOptionalBoardProvider } from '../../board-provider/board-provider-context';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import { SEARCH_CLIMBS, type ClimbSearchResponse } from '@/app/lib/graphql/operations/climb-search';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';

interface UseQueueDataFetchingProps {
  searchParams: SearchRequestPagination;
  queue: ClimbQueue;
  parsedParams: ParsedBoardRouteParameters;
  hasDoneFirstFetch: boolean;
  setHasDoneFirstFetch: () => void;
}

export const useQueueDataFetching = ({
  searchParams,
  queue,
  parsedParams,
  hasDoneFirstFetch,
  setHasDoneFirstFetch,
}: UseQueueDataFetchingProps) => {
  const getLogbook = useOptionalBoardProvider()?.getLogbook;
  // Use wsAuthToken for GraphQL backend auth (NextAuth session token)
  const { token: wsAuthToken } = useWsAuthToken();
  const fetchedUuidsRef = useRef<string>('');

  // Create a stable query key with flattened primitive values to avoid object reference changes
  const queryKey = useMemo(() => {
    // Exclude page from the key since pagination is handled by useInfiniteQuery
    const { page: _, ...paramsWithoutPage } = searchParams;
    // Flatten to primitives for stable key
    const stableFilterKey = JSON.stringify(paramsWithoutPage);
    return [
      'climbSearch',
      parsedParams.board_name,
      parsedParams.layout_id,
      parsedParams.size_id,
      parsedParams.set_ids.join(','),
      parsedParams.angle,
      stableFilterKey,
    ] as const;
  }, [searchParams, parsedParams]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    error: searchError,
  } = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam }): Promise<SearchClimbsResult> => {
      // Build GraphQL input from search params
      const input = {
        boardName: parsedParams.board_name,
        layoutId: parsedParams.layout_id,
        sizeId: parsedParams.size_id,
        setIds: parsedParams.set_ids.join(','),
        angle: parsedParams.angle,
        page: pageParam,
        pageSize: searchParams.pageSize || PAGE_LIMIT,
        gradeAccuracy: searchParams.gradeAccuracy ? String(searchParams.gradeAccuracy) : undefined,
        minGrade: searchParams.minGrade || undefined,
        maxGrade: searchParams.maxGrade || undefined,
        minAscents: searchParams.minAscents || undefined,
        sortBy: searchParams.sortBy || 'ascents',
        sortOrder: searchParams.sortOrder || 'desc',
        name: searchParams.name || undefined,
        setter: searchParams.settername && searchParams.settername.length > 0 ? searchParams.settername : undefined,
        onlyTallClimbs: searchParams.onlyTallClimbs || undefined,
        // Convert holdsFilter from LitUpHoldsMap to Record<string, HoldState> format expected by GraphQL
        holdsFilter: searchParams.holdsFilter && Object.keys(searchParams.holdsFilter).length > 0
          ? Object.fromEntries(
              Object.entries(searchParams.holdsFilter).map(([key, value]) => [
                key.replace('hold_', ''),
                value.state
              ])
            )
          : undefined,
        hideAttempted: searchParams.hideAttempted || undefined,
        hideCompleted: searchParams.hideCompleted || undefined,
        showOnlyAttempted: searchParams.showOnlyAttempted || undefined,
        showOnlyCompleted: searchParams.showOnlyCompleted || undefined,
      };

      // Create GraphQL client with auth token if available
      const client = createGraphQLHttpClient(wsAuthToken);

      try {
        const result = await client.request<ClimbSearchResponse>(SEARCH_CLIMBS, { input });
        return {
          climbs: result.searchClimbs.climbs,
          totalCount: result.searchClimbs.totalCount,
          hasMore: result.searchClimbs.hasMore,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[GraphQL] Search climbs error for ${parsedParams.board_name}:`, error);
        throw new Error(`Failed to fetch climbs: ${errorMessage}`);
      }
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      // Use hasMore flag if available (preferred), otherwise fall back to totalCount comparison
      if (lastPage.hasMore === false) {
        return undefined; // No more pages
      }
      if (lastPage.hasMore === true) {
        return allPages.length; // Next page number
      }
      // Fallback for backwards compatibility with totalCount
      if (lastPage.totalCount !== undefined) {
        const totalFetched = allPages.length * PAGE_LIMIT;
        if (totalFetched >= lastPage.totalCount) {
          return undefined;
        }
        return allPages.length;
      }
      return undefined;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  const totalSearchResultCount = data?.pages[0]?.totalCount ?? null;
  const hasMoreResults = hasNextPage ?? false;

  const climbSearchResults = useMemo(
    () => (data ? data.pages.flatMap((page) => page.climbs) : null),
    [data],
  );

  const suggestedClimbs = useMemo(
    () => {
      const filtered = (climbSearchResults || []).filter((item) => !queue.find((queueItem) => queueItem.climb?.uuid === item.uuid));
      // Deduplicate by uuid to prevent React key warnings
      return filtered.filter((climb, index, self) =>
        index === self.findIndex((c) => c.uuid === climb.uuid)
      );
    },
    [climbSearchResults, queue],
  );

  // Combine and deduplicate climb UUIDs from both search results and queue
  // Returned so callers (e.g. QueueContext) can pass to useClimbActionsData
  const climbUuids = useMemo(() => {
    const searchUuids = climbSearchResults?.map((climb) => climb.uuid) || [];
    const queueUuids = queue.map((item) => item.climb?.uuid).filter(Boolean) as string[];
    return Array.from(new Set([...searchUuids, ...queueUuids])).sort();
  }, [climbSearchResults, queue]);

  const climbUuidsString = useMemo(() => JSON.stringify(climbUuids), [climbUuids]);

  useEffect(() => {
    if (climbUuidsString === fetchedUuidsRef.current) {
      return; // Skip if we've already fetched these exact UUIDs
    }

    const climbUuids = JSON.parse(climbUuidsString);
    if (climbUuids.length > 0 && getLogbook) {
      // Only mark as fetched if the fetch actually succeeded
      // This ensures we retry when wsAuthToken becomes available
      getLogbook(climbUuids).then((success) => {
        if (success) {
          fetchedUuidsRef.current = climbUuidsString;
        }
      });
    }
  }, [climbUuidsString, getLogbook]);

  useEffect(() => {
    if (climbSearchResults && climbSearchResults.length > 0 && !hasDoneFirstFetch) {
      setHasDoneFirstFetch();
    }
  }, [climbSearchResults, hasDoneFirstFetch, setHasDoneFirstFetch]);

  const fetchMoreClimbs = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return {
    data,
    climbSearchResults,
    suggestedClimbs,
    totalSearchResultCount,
    hasMoreResults,
    isFetchingClimbs: isFetching,
    isFetchingNextPage,
    fetchMoreClimbs,
    // Combined climb UUIDs for use by useClimbActionsData
    climbUuids,
    // Error states
    searchError,
  };
};
