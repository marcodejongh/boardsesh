import React from 'react';
import { List, Card, Rate, Tag, Typography, Space } from 'antd';
import { Climb } from '@/app/lib/types';
import { useBoardProvider } from '../board-provider/board-provider-context';
import dayjs from 'dayjs';

const { Text } = Typography;

interface LogbookViewProps {
  currentClimb: Climb;
}

export const LogbookView: React.FC<LogbookViewProps> = ({ currentClimb }) => {
  const { logbook } = useBoardProvider();

  // Filter ascents for current climb
  const climbAscents = logbook.filter(
    (ascent) => ascent.climb_uuid === currentClimb.uuid
  ).sort((a, b) => 
    // Sort by date, newest first
    new Date(b.climbed_at).getTime() - new Date(a.climbed_at).getTime()
  );

  return (
    <List
      dataSource={climbAscents}
      renderItem={(ascent) => (
        <List.Item>
          <Card 
            style={{ width: '100%' }}
            size="small"
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space wrap>
                <Text strong>
                  {dayjs(ascent.climbed_at).format('MMM D, YYYY h:mm A')}
                </Text>
                <Tag color={ascent.is_benchmark ? 'gold' : 'default'}>
                  {ascent.is_benchmark ? 'Benchmark' : 'Regular'}
                </Tag>
                {ascent.angle !== currentClimb.angle && (
                  <Tag color="blue">{ascent.angle}°</Tag>
                )}
                {ascent.is_mirror && <Tag color="purple">Mirror</Tag>}
              </Space>

              <Space>
                <Text>Attempts: {ascent.bid_count}</Text>
                <Rate 
                  disabled 
                  value={ascent.quality} 
                  count={3}
                  style={{ fontSize: 14 }}
                />
              </Space>

              {ascent.comment && (
                <Text type="secondary" style={{ whiteSpace: 'pre-wrap' }}>
                  {ascent.comment}
                </Text>
              )}
            </Space>
          </Card>
        </List.Item>
      )}
      locale={{ emptyText: 'No ascents logged for this climb' }}
    />
  );
};