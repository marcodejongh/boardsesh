'use client';

import React, { useMemo, useRef, useEffect } from 'react';
import Box from '@mui/material/Box';
import MuiButton from '@mui/material/Button';
import MuiAlert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import PersonSearchOutlined from '@mui/icons-material/PersonSearchOutlined';
import PublicOutlined from '@mui/icons-material/PublicOutlined';
import ErrorOutline from '@mui/icons-material/ErrorOutline';
import { useInfiniteQuery } from '@tanstack/react-query';
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
import { useInfiniteScroll } from '@/app/hooks/use-infinite-scroll';

interface ActivityFeedProps {
  isAuthenticated: boolean;
  boardUuid?: string | null;
  sortBy?: SortMode;
  topPeriod?: TimePeriod;
  onFindClimbers?: () => void;
  /** SSR-provided initial feed result for unauthenticated users. Renders immediately while client fetches fresh data. */
  initialFeedResult?: { items: ActivityFeedItem[]; cursor: string | null; hasMore: boolean };
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
}: ActivityFeedProps) {
  const { token, isLoading: authLoading } = useWsAuthToken();

  // Track whether the authenticated user's personalized feed (feed_items) is
  // empty, so we fall back to trendingFeed (boardsesh_ticks). These two tables
  // have different id spaces, so cursors must never cross between them.
  //
  // When SSR initialData is present (always from trendingFeed), we start with
  // fallback=true so that if the user scrolls before the background refetch,
  // page 2+ correctly uses trendingFeed cursors. The background refetch of
  // page 1 checks activityFeed — if it has items, fallback is cleared and
  // React Query refetches all pages from the personalized source.
  const fallbackToTrending = useRef(false);

  const hasInitialData = !!initialFeedResult && initialFeedResult.items.length > 0;

  // When query params change, re-evaluate the fallback. If SSR data is present
  // and user is authenticated, start with fallback=true for safe cursor handling.
  useEffect(() => {
    fallbackToTrending.current = isAuthenticated && hasInitialData;
  }, [isAuthenticated, hasInitialData, boardUuid, sortBy, topPeriod]);

  const queryKey = ['activityFeed', isAuthenticated, boardUuid, sortBy, topPeriod] as const;

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, error, refetch } = useInfiniteQuery<
    ActivityFeedResult,
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
        // Page 1 (no cursor): always check the personalized feed to determine
        // the correct data source. This runs both on initial load and on
        // background refetches (when staleTime expires).
        if (!pageParam) {
          const response = await client.request<GetActivityFeedQueryResponse>(
            GET_ACTIVITY_FEED,
            { input },
          );
          if (response.activityFeed.items.length > 0) {
            fallbackToTrending.current = false;
            return response.activityFeed;
          }
          fallbackToTrending.current = true;
          // Fall through to trending
        } else if (!fallbackToTrending.current) {
          // Page 2+ with personalized feed active
          const response = await client.request<GetActivityFeedQueryResponse>(
            GET_ACTIVITY_FEED,
            { input },
          );
          return response.activityFeed;
        }
        // Page 2+ with trending fallback — fall through
      }

      const response = await client.request<GetTrendingFeedQueryResponse>(
        GET_TRENDING_FEED,
        { input },
      );
      return response.trendingFeed;
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
            pages: [initialFeedResult],
            pageParams: [null],
          },
        }
      : {}),
  });

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
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
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
          <Box ref={sentinelRef} data-testid="activity-feed-sentinel" sx={{ display: 'flex', justifyContent: 'center', py: 2, minHeight: 20 }}>
            {isFetchingNextPage && <CircularProgress size={24} />}
          </Box>
        </>
      )}
    </Box>
  );
}
