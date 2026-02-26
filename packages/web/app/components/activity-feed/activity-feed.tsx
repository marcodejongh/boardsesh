'use client';

import React, { useMemo, useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import MuiButton from '@mui/material/Button';
import MuiAlert from '@mui/material/Alert';
import PersonSearchOutlined from '@mui/icons-material/PersonSearchOutlined';
import PublicOutlined from '@mui/icons-material/PublicOutlined';
import ErrorOutline from '@mui/icons-material/ErrorOutline';
import { useInfiniteQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { EmptyState } from '@/app/components/ui/empty-state';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import {
  GET_ACTIVITY_FEED,
  GET_TRENDING_FEED,
  type GetActivityFeedQueryResponse,
  type GetTrendingFeedQueryResponse,
} from '@/app/lib/graphql/operations';
import type { ActivityFeedItem, SortMode, TimePeriod, ActivityFeedResult } from '@boardsesh/shared-schema';
import FeedItemAscent from './feed-item-ascent';
import FeedItemNewClimb from './feed-item-new-climb';
import FeedItemComment from './feed-item-comment';
import SessionSummaryFeedItem from './session-summary-feed-item';
import FeedItemSkeleton from './feed-item-skeleton';
import { useInfiniteScroll } from '@/app/hooks/use-infinite-scroll';

/** Extends the base result with a tag indicating which data source produced it. */
export type ActivityFeedPage = ActivityFeedResult & { _source: 'personalized' | 'trending' };

interface ActivityFeedProps {
  isAuthenticated: boolean;
  boardUuid?: string | null;
  sortBy?: SortMode;
  topPeriod?: TimePeriod;
  onFindClimbers?: () => void;
  /** SSR-provided initial feed result. Renders immediately while client fetches fresh data. */
  initialFeedResult?: { items: ActivityFeedItem[]; cursor: string | null; hasMore: boolean };
  /** SSR-determined data source tag, so page 2+ cache routing works correctly from the start. */
  initialFeedSource?: 'personalized' | 'trending';
}

function renderFeedItem(item: ActivityFeedItem) {
  switch (item.type) {
    case 'ascent':
      return <FeedItemAscent key={item.id} item={item} />;
    case 'new_climb':
      return <FeedItemNewClimb key={item.id} item={item} />;
    case 'comment':
      return <FeedItemComment key={item.id} item={item} />;
    case 'session_summary':
      return <SessionSummaryFeedItem key={item.id} item={item} />;
    default:
      return <FeedItemAscent key={item.id} item={item} />;
  }
}

export default function ActivityFeed({
  isAuthenticated,
  boardUuid,
  sortBy = 'new',
  topPeriod = 'all',
  onFindClimbers,
  initialFeedResult,
  initialFeedSource,
}: ActivityFeedProps) {
  const { token, isLoading: authLoading } = useWsAuthToken();
  const queryClient = useQueryClient();

  const hasInitialData = !!initialFeedResult && initialFeedResult.items.length > 0;

  const queryKey = ['activityFeed', isAuthenticated, boardUuid, sortBy, topPeriod] as const;

  // Track the previous source so we can detect when a background refetch
  // switches between personalized and trending (e.g. user gains their first
  // follower activity). When this happens we trim cached pages to page 1
  // to prevent cursor cross-contamination between the two tables.
  const prevSourceRef = useRef<'personalized' | 'trending' | null>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, error, refetch } = useInfiniteQuery<
    ActivityFeedPage,
    Error
  >({
    queryKey,
    queryFn: async ({ pageParam }) => {
      const client = createGraphQLHttpClient(isAuthenticated ? token : null);
      const input = {
        limit: 20,
        cursor: pageParam as string | null,
        boardUuid: boardUuid || undefined,
        sortBy,
        topPeriod,
      };

      if (isAuthenticated) {
        if (!pageParam) {
          // Page 1 (no cursor): probe the personalized feed to determine
          // the data source. If it has items, use personalized; otherwise
          // fall through to trending.
          const response = await client.request<GetActivityFeedQueryResponse>(
            GET_ACTIVITY_FEED,
            { input },
          );
          if (response.activityFeed.items.length > 0) {
            return { ...response.activityFeed, _source: 'personalized' as const };
          }
          // Personalized feed is empty — fall through to trending
        } else {
          // Page 2+: read the source from page 1 in the query cache
          const cached = queryClient.getQueryData<InfiniteData<ActivityFeedPage>>(queryKey);
          const page1Source = cached?.pages[0]?._source;

          if (page1Source === 'personalized') {
            const response = await client.request<GetActivityFeedQueryResponse>(
              GET_ACTIVITY_FEED,
              { input },
            );
            return { ...response.activityFeed, _source: 'personalized' as const };
          }
          // page1Source is 'trending' or unavailable — fall through
        }
      }

      const response = await client.request<GetTrendingFeedQueryResponse>(
        GET_TRENDING_FEED,
        { input },
      );
      return { ...response.trendingFeed, _source: 'trending' as const };
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore) return undefined;
      return lastPage.cursor ?? undefined;
    },
    enabled: isAuthenticated ? !!token : true,
    staleTime: 60 * 1000,
    ...(hasInitialData
      ? {
          initialData: {
            pages: [{ ...initialFeedResult, _source: (initialFeedSource ?? 'trending') as 'personalized' | 'trending' }],
            pageParams: [null],
          },
          // Tell React Query the SSR data is fresh — prevents an immediate
          // client-side refetch. Data won't be refetched until staleTime expires.
          initialDataUpdatedAt: Date.now(),
        }
      : {}),
  });

  // When a background refetch of page 1 changes the data source (e.g.
  // personalized feed gains items, or becomes empty), trim cached pages
  // to just page 1 so that page 2+ cursors match the new source.
  useEffect(() => {
    const currentSource = data?.pages[0]?._source ?? null;
    if (prevSourceRef.current !== null && currentSource !== null && prevSourceRef.current !== currentSource) {
      if (data && data.pages.length > 1) {
        queryClient.setQueryData<InfiniteData<ActivityFeedPage>>(queryKey, (old) => {
          if (!old || old.pages.length <= 1) return old;
          return {
            pages: [old.pages[0]],
            pageParams: [old.pageParams[0]],
          };
        });
      }
    }
    prevSourceRef.current = currentSource;
  }, [data?.pages[0]?._source, queryClient, queryKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const items: ActivityFeedItem[] = useMemo(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data],
  );

  const { sentinelRef } = useInfiniteScroll({
    onLoadMore: fetchNextPage,
    hasMore: hasNextPage ?? false,
    isFetching: isFetchingNextPage,
  });

  if ((authLoading || isLoading) && items.length === 0) {
    return (
      <Box data-testid="activity-feed" sx={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <FeedItemSkeleton />
        <FeedItemSkeleton />
        <FeedItemSkeleton />
      </Box>
    );
  }

  return (
    <Box data-testid="activity-feed" sx={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {!isAuthenticated && (
        <MuiAlert severity="info" sx={{ mb: 1 }}>
          Sign in to see a personalized feed from climbers you follow.
        </MuiAlert>
      )}

      {error && (
        <EmptyState
          icon={<ErrorOutline fontSize="inherit" />}
          description="Failed to load activity feed. Please try again."
        >
          <MuiButton variant="contained" onClick={() => refetch()}>
            Retry
          </MuiButton>
        </EmptyState>
      )}

      {!error && items.length === 0 ? (
        isAuthenticated ? (
          <EmptyState
            icon={<PersonSearchOutlined fontSize="inherit" />}
            description="Follow climbers to see their activity here"
          >
            {onFindClimbers && (
              <MuiButton variant="contained" onClick={onFindClimbers}>
                Find Climbers
              </MuiButton>
            )}
          </EmptyState>
        ) : (
          <EmptyState
            icon={<PublicOutlined fontSize="inherit" />}
            description="No recent activity yet"
          />
        )
      ) : (
        <>
          {items.map(renderFeedItem)}
          <Box ref={sentinelRef} data-testid="activity-feed-sentinel" sx={{ display: 'flex', flexDirection: 'column', gap: '12px', py: 2, minHeight: 20 }}>
            {isFetchingNextPage && (
              <>
                <FeedItemSkeleton />
                <FeedItemSkeleton />
              </>
            )}
          </Box>
        </>
      )}
    </Box>
  );
}
