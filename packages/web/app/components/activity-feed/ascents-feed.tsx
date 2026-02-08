'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import MuiCard from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import MuiTypography from '@mui/material/Typography';
import MuiButton from '@mui/material/Button';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Rating from '@mui/material/Rating';
import { EmptyState } from '@/app/components/ui/empty-state';
import { LoadingSpinner } from '@/app/components/ui/loading-spinner';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import ElectricBoltOutlined from '@mui/icons-material/ElectricBoltOutlined';
import CancelOutlined from '@mui/icons-material/CancelOutlined';
import LocationOnOutlined from '@mui/icons-material/LocationOnOutlined';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import {
  GET_USER_GROUPED_ASCENTS_FEED,
  type GroupedAscentFeedItem,
  type GetUserGroupedAscentsFeedQueryVariables,
  type GetUserGroupedAscentsFeedQueryResponse,
} from '@/app/lib/graphql/operations';
import AscentThumbnail from './ascent-thumbnail';
import { themeTokens } from '@/app/theme/theme-config';
import styles from './ascents-feed.module.css';

dayjs.extend(relativeTime);


interface AscentsFeedProps {
  userId: string;
  pageSize?: number;
}

// Layout name mapping
const layoutNames: Record<string, string> = {
  'kilter-1': 'Kilter Original',
  'kilter-8': 'Kilter Homewall',
  'tension-9': 'Tension Classic',
  'tension-10': 'Tension 2 Mirror',
  'tension-11': 'Tension 2 Spray',
  'moonboard-1': 'MoonBoard 2010',
  'moonboard-2': 'MoonBoard 2016',
  'moonboard-3': 'MoonBoard 2024',
  'moonboard-4': 'MoonBoard Masters 2017',
  'moonboard-5': 'MoonBoard Masters 2019',
};

const getLayoutDisplayName = (boardType: string, layoutId: number | null): string => {
  if (layoutId === null) return boardType.charAt(0).toUpperCase() + boardType.slice(1);
  const key = `${boardType}-${layoutId}`;
  return layoutNames[key] || `${boardType.charAt(0).toUpperCase() + boardType.slice(1)}`;
};

// Generate status summary for grouped attempts
const getGroupStatusSummary = (group: GroupedAscentFeedItem): { text: string; icon: React.ReactNode; color: string } => {
  const parts: string[] = [];

  // Determine primary status (best result first)
  if (group.flashCount > 0) {
    parts.push(group.flashCount === 1 ? 'Flashed' : `${group.flashCount} flashes`);
  }
  if (group.sendCount > 0) {
    parts.push(group.sendCount === 1 ? 'Sent' : `${group.sendCount} sends`);
  }
  if (group.attemptCount > 0) {
    parts.push(group.attemptCount === 1 ? '1 attempt' : `${group.attemptCount} attempts`);
  }

  // Determine color and icon based on best result
  let icon: React.ReactNode;
  let color: string;
  if (group.flashCount > 0) {
    icon = <ElectricBoltOutlined />;
    color = 'gold';
  } else if (group.sendCount > 0) {
    icon = <CheckCircleOutlined />;
    color = 'green';
  } else {
    icon = <CancelOutlined />;
    color = 'default';
  }

  return { text: parts.join(', '), icon, color };
};

const GroupedFeedItem: React.FC<{ group: GroupedAscentFeedItem }> = ({ group }) => {
  // Get the latest item's climbedAt for time display
  const latestItem = group.items.reduce((latest, item) =>
    new Date(item.climbedAt) > new Date(latest.climbedAt) ? item : latest
  );
  const timeAgo = dayjs(latestItem.climbedAt).fromNow();
  const boardDisplay = getLayoutDisplayName(group.boardType, group.layoutId);
  const statusSummary = getGroupStatusSummary(group);
  const hasSuccess = group.flashCount > 0 || group.sendCount > 0;

  return (
    <MuiCard className={styles.feedItem}>
      <CardContent sx={{ p: 1.5 }}>
      <Box sx={{ display: 'flex', gap: '12px' }}>
        {/* Thumbnail */}
        {group.frames && group.layoutId && (
          <AscentThumbnail
            boardType={group.boardType}
            layoutId={group.layoutId}
            angle={group.angle}
            climbUuid={group.climbUuid}
            climbName={group.climbName}
            frames={group.frames}
            isMirror={group.isMirror}
          />
        )}

        {/* Content */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }} className={styles.feedItemContent}>
          {/* Header with status and time */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Chip
                icon={statusSummary.icon as React.ReactElement}
                label={statusSummary.text}
                size="small"
                color={statusSummary.color === 'green' ? 'success' : undefined}
                sx={statusSummary.color === 'gold' ? { bgcolor: themeTokens.colors.amber, color: themeTokens.neutral[900] } : undefined}
                className={styles.statusTag}
              />
              <MuiTypography variant="body2" component="span" fontWeight={600} className={styles.climbName}>
                {group.climbName}
              </MuiTypography>
            </Box>
            <MuiTypography variant="body2" component="span" color="text.secondary" className={styles.timeAgo}>
              {timeAgo}
            </MuiTypography>
          </Box>

          {/* Climb details */}
          <Box sx={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {group.difficultyName && (
              <Chip label={group.difficultyName} size="small" color="primary" />
            )}
            <Chip icon={<LocationOnOutlined />} label={`${group.angle}°`} size="small" />
            <MuiTypography variant="body2" component="span" color="text.secondary" className={styles.boardType}>
              {boardDisplay}
            </MuiTypography>
            {group.isMirror && <Chip label="Mirrored" size="small" color="secondary" />}
            {group.isBenchmark && <Chip label="Benchmark" size="small" />}
          </Box>

          {/* Rating for successful sends */}
          {hasSuccess && group.bestQuality && (
            <Rating readOnly value={group.bestQuality} max={5} className={styles.rating} />
          )}

          {/* Setter info */}
          {group.setterUsername && (
            <MuiTypography variant="body2" component="span" color="text.secondary" className={styles.setter}>
              Set by {group.setterUsername}
            </MuiTypography>
          )}

          {/* Comment */}
          {group.latestComment && (
            <MuiTypography variant="body2" component="span" className={styles.comment}>{group.latestComment}</MuiTypography>
          )}
        </Box>
      </Box>
      </CardContent>
    </MuiCard>
  );
};

export const AscentsFeed: React.FC<AscentsFeedProps> = ({ userId, pageSize = 10 }) => {
  const [groups, setGroups] = useState<GroupedAscentFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const fetchFeed = useCallback(
    async (offset: number, append: boolean = false) => {
      try {
        if (append) {
          setLoadingMore(true);
        } else {
          setLoading(true);
        }

        const client = createGraphQLHttpClient(null);
        const variables: GetUserGroupedAscentsFeedQueryVariables = {
          userId,
          input: { limit: pageSize, offset },
        };

        const response = await client.request<GetUserGroupedAscentsFeedQueryResponse>(
          GET_USER_GROUPED_ASCENTS_FEED,
          variables
        );

        const { groups: newGroups, hasMore: more, totalCount: total } = response.userGroupedAscentsFeed;

        if (append) {
          setGroups((prev) => [...prev, ...newGroups]);
        } else {
          setGroups(newGroups);
        }
        setHasMore(more);
        setTotalCount(total);
        setError(null);
      } catch (err) {
        console.error('Error fetching ascents feed:', err);
        setError('Failed to load activity feed');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [userId, pageSize]
  );

  // Initial load
  useEffect(() => {
    fetchFeed(0);
  }, [fetchFeed]);

  // Load more when button clicked
  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchFeed(groups.length, true);
    }
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        description={error}
      />
    );
  }

  if (groups.length === 0) {
    return (
      <EmptyState
        description="No ascents logged yet"
      />
    );
  }

  return (
    <div className={styles.feed}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {groups.map((group) => (
          <GroupedFeedItem key={group.key} group={group} />
        ))}
      </Box>

      {hasMore && (
        <div className={styles.loadMoreContainer} ref={loadMoreRef}>
          <MuiButton
            onClick={handleLoadMore}
            disabled={loadingMore}
            variant="outlined"
            fullWidth
          >
            {loadingMore ? 'Loading...' : `Load more (${groups.length} of ${totalCount})`}
          </MuiButton>
        </div>
      )}
    </div>
  );
};

export default AscentsFeed;
