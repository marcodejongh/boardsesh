'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Box from '@mui/material/Box';
import MuiButton from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import PersonSearchOutlined from '@mui/icons-material/PersonSearchOutlined';
import { EmptyState } from '@/app/components/ui/empty-state';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import {
  GET_FOLLOWING_ASCENTS_FEED,
  type GetFollowingAscentsFeedQueryVariables,
  type GetFollowingAscentsFeedQueryResponse,
} from '@/app/lib/graphql/operations';
import type { FollowingAscentFeedItem } from '@boardsesh/shared-schema';
import SocialFeedItem from '@/app/components/activity-feed/social-feed-item';

interface FollowingAscentsFeedProps {
  onFindClimbers?: () => void;
}

export default function FollowingAscentsFeed({ onFindClimbers }: FollowingAscentsFeedProps) {
  const [items, setItems] = useState<FollowingAscentFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const { token, isAuthenticated, isLoading: authLoading } = useWsAuthToken();

  const fetchFeed = useCallback(async (offset = 0) => {
    if (!token) return;

    if (offset === 0) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const client = createGraphQLHttpClient(token);
      const response = await client.request<
        GetFollowingAscentsFeedQueryResponse,
        GetFollowingAscentsFeedQueryVariables
      >(GET_FOLLOWING_ASCENTS_FEED, { input: { limit: 20, offset } });

      const { items: newItems, hasMore: more, totalCount: total } = response.followingAscentsFeed;

      if (offset === 0) {
        setItems(newItems);
      } else {
        setItems((prev) => [...prev, ...newItems]);
      }
      setHasMore(more);
      setTotalCount(total);
    } catch (error) {
      console.error('Error fetching following feed:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [token]);

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchFeed(0);
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [isAuthenticated, token, authLoading, fetchFeed]);

  if (authLoading || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (items.length === 0) {
    return (
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
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {items.map((item) => (
        <SocialFeedItem key={item.uuid} item={item} showUserHeader />
      ))}
      {hasMore && (
        <Box sx={{ py: 2 }}>
          <MuiButton
            onClick={() => fetchFeed(items.length)}
            disabled={loadingMore}
            variant="outlined"
            fullWidth
          >
            {loadingMore ? 'Loading...' : `Load more (${items.length} of ${totalCount})`}
          </MuiButton>
        </Box>
      )}
    </Box>
  );
}
