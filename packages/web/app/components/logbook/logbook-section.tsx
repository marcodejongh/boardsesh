'use client';

import React, { useMemo } from 'react';
import { Typography, Collapse, Space, Tag } from 'antd';
import { BookOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { LogbookView } from './logbook-view';
import { Climb } from '@/app/lib/types';
import { useBoardProvider } from '../board-provider/board-provider-context';
import dayjs from 'dayjs';

const { Text } = Typography;

interface LogbookSectionProps {
  climb: Climb;
}

export const LogbookSection: React.FC<LogbookSectionProps> = ({ climb }) => {
  const { logbook } = useBoardProvider();

  // Calculate summary statistics
  const summary = useMemo(() => {
    const climbAscents = logbook.filter((ascent) => ascent.climb_uuid === climb.uuid);

    if (climbAscents.length === 0) {
      return null;
    }

    // Calculate total attempts
    const totalAttempts = climbAscents.reduce((sum, ascent) => sum + (ascent.tries || 1), 0);

    // Calculate sessions (group by date - same day = same session)
    const sessionDates = new Set(
      climbAscents.map((ascent) => dayjs(ascent.climbed_at).format('YYYY-MM-DD'))
    );
    const sessionCount = sessionDates.size;

    // Count successful ascents vs attempts
    const successfulAscents = climbAscents.filter((a) => a.is_ascent).length;
    const failedAttempts = climbAscents.filter((a) => !a.is_ascent).length;

    return {
      totalAttempts,
      sessionCount,
      successfulAscents,
      failedAttempts,
    };
  }, [logbook, climb.uuid]);

  // If no logbook entries, show empty state without collapse
  if (!summary) {
    return (
      <>
        <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: '16px 0' }}>
          <BookOutlined style={{ marginRight: 8 }} />
          No ascents logged for this climb
        </Text>
      </>
    );
  }

  const summaryLabel = (
    <Space size="middle" wrap>
      <Text strong>
        <BookOutlined style={{ marginRight: 8 }} />
        Your Logbook
      </Text>
      <Text type="secondary">
        {summary.totalAttempts} attempt{summary.totalAttempts !== 1 ? 's' : ''} in {summary.sessionCount} session{summary.sessionCount !== 1 ? 's' : ''}
      </Text>
      {summary.successfulAscents > 0 && (
        <Tag icon={<CheckCircleOutlined />} color="success">
          {summary.successfulAscents} send{summary.successfulAscents !== 1 ? 's' : ''}
        </Tag>
      )}
      {summary.failedAttempts > 0 && (
        <Tag icon={<CloseCircleOutlined />} color="default">
          {summary.failedAttempts} logged attempt{summary.failedAttempts !== 1 ? 's' : ''}
        </Tag>
      )}
    </Space>
  );

  return (
    <Collapse
      ghost
      defaultActiveKey={[]}
      items={[
        {
          key: 'logbook',
          label: summaryLabel,
          children: <LogbookView currentClimb={climb} />,
        },
      ]}
      style={{ margin: '-12px -8px' }}
    />
  );
};
