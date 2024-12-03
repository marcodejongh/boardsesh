// File: hooks/useQueueDataFetching.ts
import { useCallback } from 'react';
import useSWRInfinite from 'swr/infinite';
import { constructClimbSearchUrl, searchParamsToUrlParams } from '@/app/lib/url-utils';
import { PAGE_LIMIT } from '../../board-page/constants';
import { ClimbQueue } from '../types';
import { Climb, ParsedBoardRouteParameters, SearchRequestPagination } from '@/app/lib/types';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface UseQueueDataFetchingProps {
  searchParams: SearchRequestPagination;
  queue: ClimbQueue;
  parsedParams: ParsedBoardRouteParameters;
}

export const useQueueDataFetching = ({ searchParams, queue, parsedParams }: UseQueueDataFetchingProps) => {
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
  const climbSearchResults = data ? data.flatMap((page: { climbs: Climb[] }) => page.climbs) : null;
  const suggestedClimbs = (climbSearchResults || []).filter(
    (item) => !queue.find(({ climb: { uuid } }) => item.uuid === uuid),
  );

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
