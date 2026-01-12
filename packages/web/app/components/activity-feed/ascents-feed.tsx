'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Card, Flex, Tag, Typography, Rate, Empty, Spin, Button } from 'antd';
import {
  CheckCircleOutlined,
  ThunderboltOutlined,
  CloseCircleOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import {
  GET_USER_ASCENTS_FEED,
  type AscentFeedItem,
  type GetUserAscentsFeedQueryVariables,
  type GetUserAscentsFeedQueryResponse,
} from '@/app/lib/graphql/operations';
import AscentThumbnail from './ascent-thumbnail';
import styles from './ascents-feed.module.css';

dayjs.extend(relativeTime);

const { Text } = Typography;

// Type for grouped climb attempts
interface GroupedClimbAttempts {
  key: string; // climbUuid + day
  climbUuid: string;
  climbName: string;
  setterUsername: string | null;
  boardType: string;
  layoutId: number | null;
  angle: number;
  isMirror: boolean;
  frames: string | null;
  difficultyName: string | null;
  isBenchmark: boolean;
  date: string; // The day of the attempts
  items: AscentFeedItem[];
  flashCount: number;
  sendCount: number;
  attemptCount: number;
  bestQuality: number | null;
  latestComment: string | null;
}

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
};

const getLayoutDisplayName = (boardType: string, layoutId: number | null): string => {
  if (layoutId === null) return boardType.charAt(0).toUpperCase() + boardType.slice(1);
  const key = `${boardType}-${layoutId}`;
  return layoutNames[key] || `${boardType.charAt(0).toUpperCase() + boardType.slice(1)}`;
};

// Function to group items by climb and day
const groupItemsByClimbAndDay = (items: AscentFeedItem[]): GroupedClimbAttempts[] => {
  const groupMap = new Map<string, GroupedClimbAttempts>();

  for (const item of items) {
    const day = dayjs(item.climbedAt).format('YYYY-MM-DD');
    const key = `${item.climbUuid}-${day}`;

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        key,
        climbUuid: item.climbUuid,
        climbName: item.climbName,
        setterUsername: item.setterUsername,
        boardType: item.boardType,
        layoutId: item.layoutId,
        angle: item.angle,
        isMirror: item.isMirror,
        frames: item.frames,
        difficultyName: item.difficultyName,
        isBenchmark: item.isBenchmark,
        date: day,
        items: [],
        flashCount: 0,
        sendCount: 0,
        attemptCount: 0,
        bestQuality: null,
        latestComment: null,
      });
    }

    const group = groupMap.get(key)!;
    group.items.push(item);

    // Update counts
    if (item.status === 'flash') {
      group.flashCount++;
    } else if (item.status === 'send') {
      group.sendCount++;
    } else {
      group.attemptCount++;
    }

    // Track best quality rating
    if (item.quality !== null) {
      if (group.bestQuality === null || item.quality > group.bestQuality) {
        group.bestQuality = item.quality;
      }
    }

    // Track latest comment (prefer non-empty)
    if (item.comment && !group.latestComment) {
      group.latestComment = item.comment;
    }
  }

  // Convert to array and sort by the latest item date
  return Array.from(groupMap.values()).sort((a, b) => {
    const aLatest = Math.max(...a.items.map((i) => new Date(i.climbedAt).getTime()));
    const bLatest = Math.max(...b.items.map((i) => new Date(i.climbedAt).getTime()));
    return bLatest - aLatest;
  });
};

// Generate status summary for grouped attempts
const getGroupStatusSummary = (group: GroupedClimbAttempts): { text: string; icon: React.ReactNode; color: string } => {
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
    icon = <ThunderboltOutlined />;
    color = 'gold';
  } else if (group.sendCount > 0) {
    icon = <CheckCircleOutlined />;
    color = 'green';
  } else {
    icon = <CloseCircleOutlined />;
    color = 'default';
  }

  return { text: parts.join(', '), icon, color };
};

const GroupedFeedItem: React.FC<{ group: GroupedClimbAttempts }> = ({ group }) => {
  const latestItem = group.items.reduce((latest, item) =>
    new Date(item.climbedAt) > new Date(latest.climbedAt) ? item : latest
  );
  const timeAgo = dayjs(latestItem.climbedAt).fromNow();
  const boardDisplay = getLayoutDisplayName(group.boardType, group.layoutId);
  const statusSummary = getGroupStatusSummary(group);
  const hasSuccess = group.flashCount > 0 || group.sendCount > 0;

  return (
    <Card className={styles.feedItem} size="small">
      <Flex gap={12}>
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
        <Flex vertical gap={8} className={styles.feedItemContent}>
          {/* Header with status and time */}
          <Flex justify="space-between" align="center" wrap="wrap" gap={8}>
            <Flex align="center" gap={8}>
              <Tag
                icon={statusSummary.icon}
                color={statusSummary.color}
                className={styles.statusTag}
              >
                {statusSummary.text}
              </Tag>
              <Text strong className={styles.climbName}>
                {group.climbName}
              </Text>
            </Flex>
            <Text type="secondary" className={styles.timeAgo}>
              {timeAgo}
            </Text>
          </Flex>

          {/* Climb details */}
          <Flex gap={8} wrap="wrap" align="center">
            {group.difficultyName && (
              <Tag color="blue">{group.difficultyName}</Tag>
            )}
            <Tag icon={<EnvironmentOutlined />}>{group.angle}°</Tag>
            <Text type="secondary" className={styles.boardType}>
              {boardDisplay}
            </Text>
            {group.isMirror && <Tag color="purple">Mirrored</Tag>}
            {group.isBenchmark && <Tag color="cyan">Benchmark</Tag>}
          </Flex>

          {/* Rating for successful sends */}
          {hasSuccess && group.bestQuality && (
            <Rate disabled value={group.bestQuality} count={5} className={styles.rating} />
          )}

          {/* Setter info */}
          {group.setterUsername && (
            <Text type="secondary" className={styles.setter}>
              Set by {group.setterUsername}
            </Text>
          )}

          {/* Comment */}
          {group.latestComment && (
            <Text className={styles.comment}>{group.latestComment}</Text>
          )}
        </Flex>
      </Flex>
    </Card>
  );
};

export const AscentsFeed: React.FC<AscentsFeedProps> = ({ userId, pageSize = 10 }) => {
  const [items, setItems] = useState<AscentFeedItem[]>([]);
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
        const variables: GetUserAscentsFeedQueryVariables = {
          userId,
          input: { limit: pageSize, offset },
        };

        const response = await client.request<GetUserAscentsFeedQueryResponse>(
          GET_USER_ASCENTS_FEED,
          variables
        );

        const { items: newItems, hasMore: more, totalCount: total } = response.userAscentsFeed;

        if (append) {
          setItems((prev) => [...prev, ...newItems]);
        } else {
          setItems(newItems);
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
      fetchFeed(items.length, true);
    }
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <Spin />
      </div>
    );
  }

  if (error) {
    return (
      <Empty
        description={error}
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  // Group items by climb and day
  const groupedItems = useMemo(() => groupItemsByClimbAndDay(items), [items]);

  if (items.length === 0) {
    return (
      <Empty
        description="No ascents logged yet"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  return (
    <div className={styles.feed}>
      <Flex vertical gap={12}>
        {groupedItems.map((group) => (
          <GroupedFeedItem key={group.key} group={group} />
        ))}
      </Flex>

      {hasMore && (
        <div className={styles.loadMoreContainer} ref={loadMoreRef}>
          <Button
            onClick={handleLoadMore}
            loading={loadingMore}
            type="default"
            block
          >
            Load more ({items.length} of {totalCount})
          </Button>
        </div>
      )}
    </div>
  );
};

export default AscentsFeed;
