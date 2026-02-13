'use client';

import React, { useCallback } from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import PublicOutlined from '@mui/icons-material/PublicOutlined';
import { EmptyState } from '@/app/components/ui/empty-state';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import {
  GET_GLOBAL_ASCENTS_FEED,
  type GetGlobalAscentsFeedQueryVariables,
  type GetGlobalAscentsFeedQueryResponse,
} from '@/app/lib/graphql/operations';
import type { FollowingAscentFeedItem } from '@boardsesh/shared-schema';
import SocialFeedItem from '@/app/components/activity-feed/social-feed-item';
import { usePaginatedFeed } from '@/app/hooks/use-paginated-feed';

export default function GlobalAscentsFeed() {
  const fetchFn = useCallback(async (offset: number) => {
    const client = createGraphQLHttpClient(null);
    const response = await client.request<
      GetGlobalAscentsFeedQueryResponse,
      GetGlobalAscentsFeedQueryVariables
    >(GET_GLOBAL_ASCENTS_FEED, { input: { limit: 20, offset } });

    return response.globalAscentsFeed;
  }, []);

  const { items, loading, loadingMore, hasMore, sentinelRef } = usePaginatedFeed<FollowingAscentFeedItem>({
    fetchFn,
  });

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<PublicOutlined fontSize="inherit" />}
        description="No recent activity yet"
      />
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {items.map((item) => (
        <SocialFeedItem key={item.uuid} item={item} showUserHeader />
      ))}
      {hasMore && (
        <Box ref={sentinelRef} sx={{ display: 'flex', justifyContent: 'center', py: 2, minHeight: 20 }}>
          {loadingMore && <CircularProgress size={24} />}
        </Box>
      )}
    </Box>
  );
}
