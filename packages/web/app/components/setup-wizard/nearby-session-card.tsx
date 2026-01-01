'use client';

import React from 'react';
import { Card, Button, Typography, Space, Tag } from 'antd';
import { TeamOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { themeTokens } from '@/app/theme/theme-config';

const { Text, Title } = Typography;

// Type for discoverable sessions from GraphQL
type DiscoverableSession = {
  id: string;
  name: string | null;
  boardPath: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  createdByUserId: string | null;
  participantCount: number;
  distance: number | null;
};

type NearbySessionCardProps = {
  session: DiscoverableSession;
};

/**
 * Format distance for display
 */
function formatDistance(meters: number | null): string {
  if (meters === null) return '';
  if (meters < 1000) {
    return `${Math.round(meters)}m away`;
  }
  return `${(meters / 1000).toFixed(1)}km away`;
}

/**
 * Extract board name from boardPath
 */
function extractBoardName(boardPath: string): string {
  const parts = boardPath.split('/').filter(Boolean);
  if (parts.length > 0) {
    // Capitalize first letter
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  }
  return 'Unknown Board';
}

const NearbySessionCard = ({ session }: NearbySessionCardProps) => {
  const router = useRouter();

  const handleJoin = () => {
    // Navigate to the board path with the session ID
    const url = new URL(session.boardPath, window.location.origin);
    url.searchParams.set('session', session.id);
    router.push(url.pathname + url.search);
  };

  const boardName = extractBoardName(session.boardPath);
  const sessionName = session.name || `${boardName} Session`;

  return (
    <Card
      size="small"
      hoverable
      style={{ cursor: 'pointer' }}
      onClick={handleJoin}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <Title level={5} style={{ margin: 0, marginBottom: themeTokens.spacing[1] }}>
            {sessionName}
          </Title>
          <Space size="small" wrap>
            <Tag color="blue">{boardName}</Tag>
            {session.distance !== null && (
              <Text type="secondary" style={{ fontSize: themeTokens.typography.fontSize.sm }}>
                <EnvironmentOutlined /> {formatDistance(session.distance)}
              </Text>
            )}
            <Text type="secondary" style={{ fontSize: themeTokens.typography.fontSize.sm }}>
              <TeamOutlined /> {session.participantCount} {session.participantCount === 1 ? 'climber' : 'climbers'}
            </Text>
          </Space>
        </div>
        <Button type="primary" size="small" onClick={handleJoin}>
          Join
        </Button>
      </div>
    </Card>
  );
};

export default NearbySessionCard;
