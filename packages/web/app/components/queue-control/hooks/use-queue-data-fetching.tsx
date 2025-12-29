import { useCallback, useRef, useEffect, useMemo } from 'react';
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { searchParamsToUrlParams } from '@/app/lib/url-utils';
import { PAGE_LIMIT } from '../../board-page/constants';
import { ClimbQueue } from '../types';
import { ParsedBoardRouteParameters, SearchRequestPagination, SearchClimbsResult } from '@/app/lib/types';
import { useBoardProvider } from '../../board-provider/board-provider-context';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import { SEARCH_CLIMBS, type ClimbSearchResponse } from '@/app/lib/graphql/operations/climb-search';
import {
  GET_FAVORITES,
  TOGGLE_FAVORITE,
  type FavoritesQueryResponse,
  type ToggleFavoriteMutationResponse,
} from '@/app/lib/graphql/operations/favorites';
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
  const { getLogbook } = useBoardProvider();
  // Use wsAuthToken for GraphQL backend auth (NextAuth session token)
  const { token: wsAuthToken, isAuthenticated, isLoading: isAuthLoading } = useWsAuthToken();
  const queryClient = useQueryClient();
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
        setter: searchParams.settername?.[0] || undefined,
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
    () => (climbSearchResults || []).filter((item) => !queue.find((queueItem) => queueItem.climb?.uuid === item.uuid)),
    [climbSearchResults, queue],
  );

  // Combine and deduplicate climb UUIDs from both sources
  const climbUuids = useMemo(() => {
    const searchUuids = climbSearchResults?.map((climb) => climb.uuid) || [];
    const queueUuids = queue.map((item) => item.climb?.uuid).filter(Boolean) as string[];
    return Array.from(new Set([...searchUuids, ...queueUuids])).sort();
  }, [climbSearchResults, queue]);

  const climbUuidsString = useMemo(() => JSON.stringify(climbUuids), [climbUuids]);

  // Favorites query - fetches all favorites for visible climbs in one request
  const favoritesQueryKey = useMemo(
    () => ['favorites', parsedParams.board_name, parsedParams.angle, climbUuids.join(',')] as const,
    [parsedParams.board_name, parsedParams.angle, climbUuids]
  );

  const { data: favoritesData, isLoading: isLoadingFavorites, error: favoritesError } = useQuery({
    queryKey: favoritesQueryKey,
    queryFn: async (): Promise<Set<string>> => {
      if (climbUuids.length === 0) return new Set();

      const client = createGraphQLHttpClient(wsAuthToken);
      try {
        const result = await client.request<FavoritesQueryResponse>(GET_FAVORITES, {
          boardName: parsedParams.board_name,
          climbUuids,
          angle: parsedParams.angle,
        });
        return new Set(result.favorites);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[GraphQL] Favorites query error for ${parsedParams.board_name}:`, error);
        throw new Error(`Failed to fetch favorites: ${errorMessage}`);
      }
    },
    // Wait for auth to finish loading before making authenticated requests
    enabled: isAuthenticated && !isAuthLoading && climbUuids.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  const favorites = favoritesData ?? new Set<string>();

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async (climbUuid: string): Promise<{ uuid: string; favorited: boolean }> => {
      const client = createGraphQLHttpClient(wsAuthToken);
      try {
        const result = await client.request<ToggleFavoriteMutationResponse>(TOGGLE_FAVORITE, {
          input: {
            boardName: parsedParams.board_name,
            climbUuid,
            angle: parsedParams.angle,
          },
        });
        return { uuid: climbUuid, favorited: result.toggleFavorite.favorited };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[GraphQL] Toggle favorite error for climb ${climbUuid}:`, error);
        throw new Error(`Failed to toggle favorite: ${errorMessage}`);
      }
    },
    onMutate: async (climbUuid: string) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: favoritesQueryKey });

      // Snapshot previous value
      const previousFavorites = queryClient.getQueryData<Set<string>>(favoritesQueryKey);

      // Optimistic update
      queryClient.setQueryData<Set<string>>(favoritesQueryKey, (old) => {
        const next = new Set(old);
        if (next.has(climbUuid)) {
          next.delete(climbUuid);
        } else {
          next.add(climbUuid);
        }
        return next;
      });

      return { previousFavorites };
    },
    onError: (err, climbUuid, context) => {
      // Log the error with context
      console.error(`[Favorites] Error toggling favorite for climb ${climbUuid}:`, err);
      // Rollback on error
      if (context?.previousFavorites) {
        queryClient.setQueryData(favoritesQueryKey, context.previousFavorites);
      }
      // Show user feedback
      message.error('Failed to update favorite. Please try again.');
    },
    // Don't invalidate on settled - optimistic update is sufficient
    // Only invalidate on error (handled above via rollback)
  });

  const toggleFavorite = useCallback(
    async (climbUuid: string): Promise<boolean> => {
      if (!isAuthenticated) return false;
      const result = await toggleFavoriteMutation.mutateAsync(climbUuid);
      return result.favorited;
    },
    [isAuthenticated, toggleFavoriteMutation]
  );

  const isFavorited = useCallback(
    (climbUuid: string): boolean => favorites.has(climbUuid),
    [favorites]
  );

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
    // Favorites
    favorites,
    isFavorited,
    toggleFavorite,
    isLoadingFavorites,
    isAuthenticated,
    isAuthLoading,
    // Error states
    searchError,
    favoritesError,
  };
};
