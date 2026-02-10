'use client';

import React, { useCallback } from 'react';
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
import { usePaginatedFeed } from '@/app/hooks/use-paginated-feed';

interface FollowingAscentsFeedProps {
  onFindClimbers?: () => void;
}

export default function FollowingAscentsFeed({ onFindClimbers }: FollowingAscentsFeedProps) {
  const { token, isAuthenticated, isLoading: authLoading } = useWsAuthToken();

  const fetchFn = useCallback(async (offset: number) => {
    if (!token) return { items: [] as FollowingAscentFeedItem[], hasMore: false, totalCount: 0 };

    const client = createGraphQLHttpClient(token);
    const response = await client.request<
      GetFollowingAscentsFeedQueryResponse,
      GetFollowingAscentsFeedQueryVariables
    >(GET_FOLLOWING_ASCENTS_FEED, { input: { limit: 20, offset } });

    return response.followingAscentsFeed;
  }, [token]);

  const { items, loading, loadingMore, hasMore, totalCount, loadMore } = usePaginatedFeed<FollowingAscentFeedItem>({
    fetchFn,
    enabled: isAuthenticated && !!token,
  });

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
            onClick={loadMore}
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
