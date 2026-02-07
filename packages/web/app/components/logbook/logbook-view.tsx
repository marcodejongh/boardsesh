import React from 'react';
import { Card, Rate, Tag, Typography, Space, Flex, Empty } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { Climb } from '@/app/lib/types';
import { useBoardProvider } from '../board-provider/board-provider-context';
import dayjs from 'dayjs';

const { Text } = Typography;

interface LogbookViewProps {
  currentClimb: Climb;
}

export const LogbookView: React.FC<LogbookViewProps> = ({ currentClimb }) => {
  const { logbook, boardName } = useBoardProvider();

  // Filter ascents for current climb and sort by climbed_at
  const climbAscents = logbook
    .filter((ascent) => ascent.climb_uuid === currentClimb.uuid)
    .sort((a, b) => {
      // Parse dates using dayjs and compare them
      const dateA = dayjs(a.climbed_at);
      const dateB = dayjs(b.climbed_at);
      return dateB.valueOf() - dateA.valueOf(); // Descending order (newest first)
    });

  const showMirrorTag = boardName === 'tension';

  if (climbAscents.length === 0) {
    return <Empty description="No ascents logged for this climb" />;
  }

  return (
    <Flex vertical gap={8}>
      {climbAscents.map((ascent) => (
        <Card key={`${ascent.climb_uuid}-${ascent.climbed_at}`} style={{ width: '100%' }} size="small">
          <Space orientation="vertical" style={{ width: '100%' }}>
            <Space wrap>
              <Text strong>{dayjs(ascent.climbed_at).format('MMM D, YYYY h:mm A')}</Text>
              {ascent.angle !== currentClimb.angle && (
                <>
                  <Tag color="blue">{ascent.angle}°</Tag>
                  {ascent.is_ascent ? (
                    <CheckOutlined style={{ color: '#9CA3AF' }} />
                  ) : (
                    <CloseOutlined style={{ color: '#9CA3AF' }} />
                  )}
                </>
              )}
              {showMirrorTag && ascent.is_mirror && <Tag color="purple">Mirrored</Tag>}
            </Space>
            {ascent.is_ascent && ascent.quality && (
              <>
                <Space>
                  <Rate disabled value={ascent.quality} count={5} style={{ fontSize: 14 }} />
                </Space>
              </>
            )}
            <Space>
              <Text>Attempts: {ascent.tries}</Text>
            </Space>

            {ascent.comment && (
              <Text type="secondary" style={{ whiteSpace: 'pre-wrap' }}>
                {ascent.comment}
              </Text>
            )}
          </Space>
        </Card>
      ))}
    </Flex>
  );
};
