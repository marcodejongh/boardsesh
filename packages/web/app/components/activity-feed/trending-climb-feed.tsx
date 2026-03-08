'use client';

import React, { useMemo, useCallback } from 'react';
import Box from '@mui/material/Box';
import MuiButton from '@mui/material/Button';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ErrorOutline from '@mui/icons-material/ErrorOutline';
import TrendingUpOutlined from '@mui/icons-material/TrendingUpOutlined';
import WhatshotOutlined from '@mui/icons-material/WhatshotOutlined';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { EmptyState } from '@/app/components/ui/empty-state';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import {
  GET_TRENDING_CLIMBS,
  GET_HOT_CLIMBS,
  type GetTrendingClimbsQueryResponse,
  type GetHotClimbsQueryResponse,
} from '@/app/lib/graphql/operations';
import type { TrendingClimbItem, TrendingClimbFeedResult } from '@boardsesh/shared-schema';
import TrendingClimbCard from './trending-climb-card';
import FeedItemSkeleton from './feed-item-skeleton';
import { useInfiniteScroll } from '@/app/hooks/use-infinite-scroll';

const VALID_PERIODS = [7, 14, 30] as const;
type TimePeriod = typeof VALID_PERIODS[number];

interface TrendingClimbFeedProps {
  isAuthenticated: boolean;
  boardUuid?: string | null;
  mode: 'trending' | 'hot';
}

export default function TrendingClimbFeed({
  isAuthenticated,
  boardUuid,
  mode,
}: TrendingClimbFeedProps) {
  const { token } = useWsAuthToken();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const PAGE_SIZE = 20;

  const periodParam = Number(searchParams.get('period'));
  const timePeriodDays: TimePeriod = VALID_PERIODS.includes(periodParam as TimePeriod)
    ? (periodParam as TimePeriod)
    : 7;

  const handlePeriodChange = useCallback((_: React.MouseEvent<HTMLElement>, newPeriod: TimePeriod | null) => {
    if (newPeriod === null) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('period', String(newPeriod));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, router, pathname]);

  const queryDocument = mode === 'trending' ? GET_TRENDING_CLIMBS : GET_HOT_CLIMBS;
  const queryKey = [mode === 'trending' ? 'trendingClimbs' : 'hotClimbs', boardUuid, timePeriodDays] as const;

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, error, refetch } = useInfiniteQuery<
    TrendingClimbFeedResult,
    Error
  >({
    queryKey,
    queryFn: async ({ pageParam }) => {
      const client = createGraphQLHttpClient(isAuthenticated ? token : null);
      const variables = {
        input: {
          limit: PAGE_SIZE,
          offset: (pageParam as number) || 0,
          timePeriodDays,
          ...(boardUuid ? { boardUuid } : {}),
        },
      };

      if (mode === 'trending') {
        const response = await client.request<GetTrendingClimbsQueryResponse>(queryDocument, variables);
        return response.trendingClimbs;
      } else {
        const response = await client.request<GetHotClimbsQueryResponse>(queryDocument, variables);
        return response.hotClimbs;
      }
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined;
      return allPages.reduce((total, page) => total + page.items.length, 0);
    },
    enabled: isAuthenticated ? !!token : true,
    staleTime: 5 * 60 * 1000,
  });

  const items: TrendingClimbItem[] = useMemo(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data],
  );

  const { sentinelRef } = useInfiniteScroll({
    onLoadMore: fetchNextPage,
    hasMore: hasNextPage ?? false,
    isFetching: isFetchingNextPage,
  });

  const EmptyIcon = mode === 'trending' ? TrendingUpOutlined : WhatshotOutlined;

  return (
    <Box
      data-testid={`${mode}-feed`}
      sx={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
    >
      <ToggleButtonGroup
        value={timePeriodDays}
        exclusive
        onChange={handlePeriodChange}
        size="small"
        sx={{ alignSelf: 'flex-start' }}
      >
        <ToggleButton value={7}>7d</ToggleButton>
        <ToggleButton value={14}>14d</ToggleButton>
        <ToggleButton value={30}>30d</ToggleButton>
      </ToggleButtonGroup>

      {isLoading && items.length === 0 && (
        <>
          <FeedItemSkeleton />
          <FeedItemSkeleton />
          <FeedItemSkeleton />
        </>
      )}

      {error && (
        <EmptyState
          icon={<ErrorOutline fontSize="inherit" />}
          description={`Failed to load ${mode} climbs. Please try again.`}
        >
          <MuiButton variant="contained" onClick={() => refetch()}>
            Retry
          </MuiButton>
        </EmptyState>
      )}

      {!error && !isLoading && items.length === 0 ? (
        <EmptyState
          icon={<EmptyIcon fontSize="inherit" />}
          description={`No ${mode} climbs yet. Check back after more syncs.`}
        />
      ) : (
        <>
          {items.map((item) => (
            <TrendingClimbCard
              key={`${item.climbUuid}-${item.angle}`}
              item={item}
              mode={mode}
            />
          ))}
          <Box
            ref={sentinelRef}
            data-testid={`${mode}-feed-sentinel`}
            sx={{ display: 'flex', flexDirection: 'column', gap: '12px', py: 2, minHeight: 20 }}
          >
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
