import { useCallback, useRef, useEffect, useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { constructClimbSearchUrl, searchParamsToUrlParams } from '@/app/lib/url-utils';
import { PAGE_LIMIT } from '../../board-page/constants';
import { ClimbQueue } from '../types';
import { ParsedBoardRouteParameters, SearchRequestPagination, SearchClimbsResult } from '@/app/lib/types';
import { useBoardProvider } from '../../board-provider/board-provider-context';

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
  const { getLogbook, token, user_id } = useBoardProvider();
  const fetchedUuidsRef = useRef<string>('');

  // Create a stable query key that changes when search params change
  const queryKey = useMemo(() => {
    // Exclude page from the key since pagination is handled by useInfiniteQuery
    const { page: _, ...paramsWithoutPage } = searchParams;
    return ['climbSearch', parsedParams, paramsWithoutPage] as const;
  }, [searchParams, parsedParams]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam }): Promise<SearchClimbsResult> => {
      const queryString = searchParamsToUrlParams({
        ...searchParams,
        page: pageParam,
      }).toString();

      const url = constructClimbSearchUrl(parsedParams, queryString);

      const headers: Record<string, string> = {};
      if (token && user_id) {
        headers['x-auth-token'] = token;
        headers['x-user-id'] = user_id.toString();
      }

      const response = await fetch(url, { headers });
      if (!response.ok) {
        throw new Error('Failed to fetch climbs');
      }
      return response.json();
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const totalFetched = allPages.length * PAGE_LIMIT;
      if (totalFetched >= lastPage.totalCount) {
        return undefined; // No more pages
      }
      return allPages.length; // Next page number
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
    () => (climbSearchResults || []).filter((item) => !queue.find((queueItem) => queueItem.climb?.uuid === item.uuid)),
    [climbSearchResults, queue],
  );

  // Combine and deduplicate climb UUIDs from both sources
  const climbUuidsString = useMemo(() => {
    const searchUuids = climbSearchResults?.map((climb) => climb.uuid) || [];
    const queueUuids = queue.map((item) => item.climb?.uuid).filter(Boolean);
    const uniqueUuids = Array.from(new Set([...searchUuids, ...queueUuids]));
    return JSON.stringify(uniqueUuids.sort());
  }, [climbSearchResults, queue]);

  useEffect(() => {
    if (climbUuidsString === fetchedUuidsRef.current) {
      return; // Skip if we've already fetched these exact UUIDs
    }

    const climbUuids = JSON.parse(climbUuidsString);
    if (climbUuids.length > 0) {
      getLogbook(climbUuids);
      fetchedUuidsRef.current = climbUuidsString;
    }
  }, [climbUuidsString, getLogbook]);

  useEffect(() => {
    if (climbSearchResults && climbSearchResults.length > 0 && !hasDoneFirstFetch) {
      setHasDoneFirstFetch();
    }
  }, [climbSearchResults, hasDoneFirstFetch, setHasDoneFirstFetch]);

  const fetchMoreClimbs = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      // Update URL with new page number for scroll restoration
      const currentPage = data?.pages.length ?? 0;
      const newParams = { ...searchParams, page: currentPage };
      history.replaceState(null, '', `${window.location.pathname}?${searchParamsToUrlParams(newParams).toString()}`);
      fetchNextPage();
    }
  }, [searchParams, hasNextPage, isFetchingNextPage, fetchNextPage, data?.pages.length]);

  return {
    data,
    climbSearchResults,
    suggestedClimbs,
    totalSearchResultCount,
    hasMoreResults,
    isFetchingClimbs: isFetching,
    isFetchingNextPage,
    fetchMoreClimbs,
  };
};
