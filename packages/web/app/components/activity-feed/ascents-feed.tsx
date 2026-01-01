'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
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
import styles from './ascents-feed.module.css';

dayjs.extend(relativeTime);

const { Text, Title } = Typography;

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

// Status icon and color mapping
const getStatusIcon = (status: 'flash' | 'send' | 'attempt') => {
  switch (status) {
    case 'flash':
      return <ThunderboltOutlined />;
    case 'send':
      return <CheckCircleOutlined />;
    case 'attempt':
      return <CloseCircleOutlined />;
  }
};

const getStatusColor = (status: 'flash' | 'send' | 'attempt') => {
  switch (status) {
    case 'flash':
      return 'gold';
    case 'send':
      return 'green';
    case 'attempt':
      return 'default';
  }
};

const getStatusText = (status: 'flash' | 'send' | 'attempt') => {
  switch (status) {
    case 'flash':
      return 'Flashed';
    case 'send':
      return 'Sent';
    case 'attempt':
      return 'Attempted';
  }
};

const FeedItem: React.FC<{ item: AscentFeedItem }> = ({ item }) => {
  const timeAgo = dayjs(item.climbedAt).fromNow();
  const boardDisplay = getLayoutDisplayName(item.boardType, item.layoutId);
  const statusText = getStatusText(item.status);
  const isSuccess = item.status === 'flash' || item.status === 'send';

  return (
    <Card className={styles.feedItem} size="small">
      <Flex vertical gap={8}>
        {/* Header with status and time */}
        <Flex justify="space-between" align="center" wrap="wrap" gap={8}>
          <Flex align="center" gap={8}>
            <Tag
              icon={getStatusIcon(item.status)}
              color={getStatusColor(item.status)}
              className={styles.statusTag}
            >
              {statusText}
            </Tag>
            <Text strong className={styles.climbName}>
              {item.climbName}
            </Text>
          </Flex>
          <Text type="secondary" className={styles.timeAgo}>
            {timeAgo}
          </Text>
        </Flex>

        {/* Climb details */}
        <Flex gap={8} wrap="wrap" align="center">
          {item.difficultyName && (
            <Tag color="blue">{item.difficultyName}</Tag>
          )}
          <Tag icon={<EnvironmentOutlined />}>{item.angle}°</Tag>
          <Text type="secondary" className={styles.boardType}>
            {boardDisplay}
          </Text>
          {item.isMirror && <Tag color="purple">Mirrored</Tag>}
          {item.isBenchmark && <Tag color="cyan">Benchmark</Tag>}
        </Flex>

        {/* Attempts count for sends */}
        {item.status === 'send' && item.attemptCount > 1 && (
          <Text type="secondary" className={styles.attempts}>
            {item.attemptCount} attempts
          </Text>
        )}

        {/* Rating for successful sends */}
        {isSuccess && item.quality && (
          <Rate disabled value={item.quality} count={5} className={styles.rating} />
        )}

        {/* Setter info */}
        {item.setterUsername && (
          <Text type="secondary" className={styles.setter}>
            Set by {item.setterUsername}
          </Text>
        )}

        {/* Comment */}
        {item.comment && (
          <Text className={styles.comment}>{item.comment}</Text>
        )}
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
        {items.map((item) => (
          <FeedItem key={item.uuid} item={item} />
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
