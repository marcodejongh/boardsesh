'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Box from '@mui/material/Box';
import MuiButton from '@mui/material/Button';
import MuiCard from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import MuiAvatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import PersonOutlined from '@mui/icons-material/PersonOutlined';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import ElectricBoltOutlined from '@mui/icons-material/ElectricBoltOutlined';
import CancelOutlined from '@mui/icons-material/CancelOutlined';
import LocationOnOutlined from '@mui/icons-material/LocationOnOutlined';
import PersonSearchOutlined from '@mui/icons-material/PersonSearchOutlined';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { EmptyState } from '@/app/components/ui/empty-state';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import {
  GET_FOLLOWING_ASCENTS_FEED,
  type GetFollowingAscentsFeedQueryVariables,
  type GetFollowingAscentsFeedQueryResponse,
} from '@/app/lib/graphql/operations';
import type { FollowingAscentFeedItem } from '@boardsesh/shared-schema';
import { themeTokens } from '@/app/theme/theme-config';

dayjs.extend(relativeTime);

interface FollowingAscentsFeedProps {
  onFindClimbers?: () => void;
}

const getStatusDisplay = (status: string) => {
  switch (status) {
    case 'flash':
      return { label: 'Flash', icon: <ElectricBoltOutlined />, color: themeTokens.colors.amber };
    case 'send':
      return { label: 'Send', icon: <CheckCircleOutlined />, chipColor: 'success' as const };
    case 'attempt':
      return { label: 'Attempt', icon: <CancelOutlined />, chipColor: undefined };
    default:
      return { label: status, icon: null, chipColor: undefined };
  }
};

const FeedItem: React.FC<{ item: FollowingAscentFeedItem }> = ({ item }) => {
  const timeAgo = dayjs(item.climbedAt).fromNow();
  const statusDisplay = getStatusDisplay(item.status);

  return (
    <MuiCard sx={{ mb: 1.5 }}>
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        {/* User header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <MuiAvatar
            src={item.userAvatarUrl ?? undefined}
            sx={{ width: 32, height: 32 }}
            component="a"
            href={`/crusher/${item.userId}`}
          >
            {!item.userAvatarUrl && <PersonOutlined sx={{ fontSize: 16 }} />}
          </MuiAvatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="body2"
              fontWeight={600}
              component="a"
              href={`/crusher/${item.userId}`}
              sx={{ textDecoration: 'none', color: 'text.primary' }}
            >
              {item.userDisplayName || 'User'}
            </Typography>
            <Typography variant="body2" component="span" color="text.secondary">
              {' '}climbed{' '}
            </Typography>
            <Typography variant="body2" component="span" fontWeight={600}>
              {item.climbName}
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
            {timeAgo}
          </Typography>
        </Box>

        {/* Climb details */}
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
          {item.difficultyName && (
            <Chip label={item.difficultyName} size="small" color="primary" />
          )}
          <Chip icon={<LocationOnOutlined />} label={`${item.angle}°`} size="small" />
          <Chip
            icon={statusDisplay.icon as React.ReactElement}
            label={statusDisplay.label}
            size="small"
            color={statusDisplay.chipColor}
            sx={statusDisplay.color ? { bgcolor: statusDisplay.color, color: themeTokens.neutral[900] } : undefined}
          />
          {item.isMirror && <Chip label="Mirror" size="small" variant="outlined" />}
          {item.attemptCount > 1 && (
            <Typography variant="caption" color="text.secondary">
              {item.attemptCount} attempts
            </Typography>
          )}
        </Box>

        {/* Comment */}
        {item.comment && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            &quot;{item.comment}&quot;
          </Typography>
        )}
      </CardContent>
    </MuiCard>
  );
};

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
    <Box>
      {items.map((item) => (
        <FeedItem key={item.uuid} item={item} />
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
