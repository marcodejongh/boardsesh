import { useCallback, useRef } from 'react';
import useSWRInfinite from 'swr/infinite';
import { constructClimbSearchUrl, searchParamsToUrlParams } from '@/app/lib/url-utils';
import { PAGE_LIMIT } from '../../board-page/constants';
import { ClimbQueue } from '../types';
import { Climb, ParsedBoardRouteParameters, SearchRequestPagination } from '@/app/lib/types';
import { useEffect, useMemo } from 'react';
import { useBoardProvider } from '../../board-provider/board-provider-context';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

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
  const { getLogbook } = useBoardProvider();
  const fetchedUuidsRef = useRef<string>('');

  const getKey = (pageIndex: number, previousPageData: { climbs: Climb[] }) => {
    if (previousPageData && previousPageData.climbs.length === 0) return null;

    const queryString = searchParamsToUrlParams({
      ...searchParams,
      page: pageIndex,
    }).toString();

    return constructClimbSearchUrl(parsedParams, queryString);
  };

  const {
    data,
    size,
    setSize,
    isLoading: isFetchingClimbs,
  } = useSWRInfinite(getKey, fetcher, {
    revalidateOnFocus: false,
    revalidateFirstPage: false,
    initialSize: searchParams.page ? searchParams.page + 1 : 1,
  });

  const hasMoreResults = data && data[0] && size * PAGE_LIMIT < data[0].totalCount;
  const totalSearchResultCount = (data && data[0] && data[0].totalCount) || null;

  const climbSearchResults = useMemo(
    () => (data ? data.flatMap((page: { climbs: Climb[] }) => page.climbs) : null),
    [data],
  );

  const suggestedClimbs = useMemo(
    () => (climbSearchResults || []).filter((item) => !queue.find(({ climb: { uuid } }) => item.uuid === uuid)),
    [climbSearchResults, queue],
  );

  // Combine and deduplicate climb UUIDs from both sources
  const climbUuidsString = useMemo(() => {
    const searchUuids = climbSearchResults?.map((climb) => climb.uuid) || [];
    const queueUuids = queue.map((item) => item.climb.uuid);
    const uniqueUuids = Array.from(new Set([...searchUuids, ...queueUuids]));
    return JSON.stringify(uniqueUuids.sort());
  }, [climbSearchResults, queue]);

  useEffect(() => {
    if (climbUuidsString === fetchedUuidsRef.current) {
      return; // Skip if we've already fetched these exact UUIDs
    }

    console.log('Fetching logbook for UUIDs:', climbUuidsString); // Debug log
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
    setSize((oldSize) => {
      const newParams = { ...searchParams, page: oldSize + 1 };
      history.replaceState(null, '', `${window.location.pathname}?${searchParamsToUrlParams(newParams).toString()}`);
      return oldSize + 1;
    });
  }, [searchParams, setSize]);

  return {
    data,
    climbSearchResults,
    suggestedClimbs,
    totalSearchResultCount,
    hasMoreResults,
    isFetchingClimbs,
    fetchMoreClimbs,
  };
};
