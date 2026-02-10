'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import MuiButton from '@mui/material/Button';
import MuiAlert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import PersonSearchOutlined from '@mui/icons-material/PersonSearchOutlined';
import PublicOutlined from '@mui/icons-material/PublicOutlined';
import { EmptyState } from '@/app/components/ui/empty-state';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import {
  GET_ACTIVITY_FEED,
  GET_TRENDING_FEED,
  type GetActivityFeedQueryResponse,
  type GetTrendingFeedQueryResponse,
} from '@/app/lib/graphql/operations';
import type { ActivityFeedItem, SortMode, TimePeriod } from '@boardsesh/shared-schema';
import FeedItemAscent from './feed-item-ascent';
import FeedItemNewClimb from './feed-item-new-climb';
import FeedItemComment from './feed-item-comment';

interface ActivityFeedProps {
  isAuthenticated: boolean;
  boardUuid?: string | null;
  sortBy?: SortMode;
  topPeriod?: TimePeriod;
  onFindClimbers?: () => void;
}

function renderFeedItem(item: ActivityFeedItem) {
  switch (item.type) {
    case 'ascent':
      return <FeedItemAscent key={item.id} item={item} />;
    case 'new_climb':
      return <FeedItemNewClimb key={item.id} item={item} />;
    case 'comment':
      return <FeedItemComment key={item.id} item={item} />;
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
}: ActivityFeedProps) {
  const [items, setItems] = useState<ActivityFeedItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const { token, isLoading: authLoading } = useWsAuthToken();

  // Track dependencies for reset
  const prevDeps = useRef({ boardUuid, sortBy });

  const fetchFeed = useCallback(async (cursorValue: string | null = null) => {
    if (cursorValue === null) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const client = createGraphQLHttpClient(isAuthenticated ? token : null);

      const input = {
        limit: 20,
        cursor: cursorValue,
        boardUuid: boardUuid || undefined,
        sortBy,
        topPeriod,
      };

      if (isAuthenticated) {
        const response = await client.request<GetActivityFeedQueryResponse>(
          GET_ACTIVITY_FEED,
          { input }
        );
        const { items: newItems, cursor: nextCursor, hasMore: more } = response.activityFeed;

        if (cursorValue === null) {
          setItems(newItems);
        } else {
          setItems((prev) => [...prev, ...newItems]);
        }
        setCursor(nextCursor ?? null);
        setHasMore(more);
      } else {
        const response = await client.request<GetTrendingFeedQueryResponse>(
          GET_TRENDING_FEED,
          { input }
        );
        const { items: newItems, cursor: nextCursor, hasMore: more } = response.trendingFeed;

        if (cursorValue === null) {
          setItems(newItems);
        } else {
          setItems((prev) => [...prev, ...newItems]);
        }
        setCursor(nextCursor ?? null);
        setHasMore(more);
      }
    } catch (error) {
      console.error('Error fetching activity feed:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [isAuthenticated, token, boardUuid, sortBy, topPeriod]);

  // Initial load and reset on dependency changes
  useEffect(() => {
    const depsChanged =
      prevDeps.current.boardUuid !== boardUuid ||
      prevDeps.current.sortBy !== sortBy;

    prevDeps.current = { boardUuid, sortBy };

    if (isAuthenticated && !token && !authLoading) {
      setLoading(false);
      return;
    }

    if (isAuthenticated && !token) return;

    if (depsChanged) {
      setItems([]);
      setCursor(null);
      setHasMore(false);
    }

    fetchFeed(null);
  }, [isAuthenticated, token, authLoading, boardUuid, sortBy, fetchFeed]);

  if (authLoading || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {!isAuthenticated && (
        <MuiAlert severity="info" sx={{ mb: 1 }}>
          Sign in to see a personalized feed from climbers you follow.
        </MuiAlert>
      )}

      {items.length === 0 ? (
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
          {hasMore && (
            <Box sx={{ py: 2 }}>
              <MuiButton
                onClick={() => fetchFeed(cursor)}
                disabled={loadingMore}
                variant="outlined"
                fullWidth
              >
                {loadingMore ? 'Loading...' : 'Load more'}
              </MuiButton>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
