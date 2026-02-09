'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Box from '@mui/material/Box';
import MuiButton from '@mui/material/Button';
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

export default function GlobalAscentsFeed() {
  const [items, setItems] = useState<FollowingAscentFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const fetchFeed = useCallback(async (offset = 0) => {
    if (offset === 0) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const client = createGraphQLHttpClient(null);
      const response = await client.request<
        GetGlobalAscentsFeedQueryResponse,
        GetGlobalAscentsFeedQueryVariables
      >(GET_GLOBAL_ASCENTS_FEED, { input: { limit: 20, offset } });

      const { items: newItems, hasMore: more, totalCount: total } = response.globalAscentsFeed;

      if (offset === 0) {
        setItems(newItems);
      } else {
        setItems((prev) => [...prev, ...newItems]);
      }
      setHasMore(more);
      setTotalCount(total);
    } catch (error) {
      console.error('Error fetching global feed:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed(0);
  }, [fetchFeed]);

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
