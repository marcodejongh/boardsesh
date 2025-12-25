'use client';

import React, { useState } from 'react';
import { Button, Drawer, Card, Row, Col, Rate, Spin, Typography, Divider } from 'antd';
import { useRouter, usePathname } from 'next/navigation';
import { track } from '@vercel/analytics';
import useSWR from 'swr';
import { ANGLES } from '@/app/lib/board-data';
import { BoardName, Climb } from '@/app/lib/types';
import { ClimbStatsForAngle } from '@/app/lib/data/queries';

const { Text, Title } = Typography;

type AngleSelectorProps = {
  boardName: BoardName;
  currentAngle: number;
  currentClimb: Climb | null;
};

export default function AngleSelector({ boardName, currentAngle, currentClimb }: AngleSelectorProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  
  // Build the API URL for fetching climb stats
  const climbStatsUrl = currentClimb
    ? `/api/v1/${boardName}/climb-stats/${currentClimb.uuid}`
    : null;
  
  // Fetch climb stats for all angles when there's a current climb
  const { data: climbStats, isLoading } = useSWR<ClimbStatsForAngle[]>(
    climbStatsUrl,
    (url: string) => fetch(url).then(res => res.json()),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );
  
  // Create a map for easy lookup of stats by angle
  const statsMap = React.useMemo(() => {
    if (!climbStats) return new Map();
    return new Map(climbStats.map(stat => [stat.angle, stat]));
  }, [climbStats]);

  const handleAngleChange = (newAngle: number) => {
    track('Angle Changed', {
      angle: newAngle,
    });

    // Replace the current angle in the URL with the new one
    const pathSegments = pathname.split('/');
    const angleIndex = pathSegments.findIndex((segment) => segment === currentAngle.toString());

    if (angleIndex !== -1) {
      pathSegments[angleIndex] = newAngle.toString();
      const newPath = pathSegments.join('/');
      router.push(newPath);
    }

    setIsDrawerOpen(false);
  };

  const renderClimbStats = (angle: number) => {
    const stats = statsMap.get(angle);
    if (!stats || !currentClimb) return null;

    return (
      <div style={{ marginTop: 8 }}>
        <Divider style={{ margin: '8px 0' }} />
        {stats.difficulty && (
          <div style={{ marginBottom: 4 }}>
            <Text strong style={{ fontSize: '12px' }}>Grade: </Text>
            <Text style={{ fontSize: '12px' }}>{stats.difficulty}</Text>
          </div>
        )}
        {stats.quality_average !== null && (
          <div style={{ marginBottom: 4 }}>
            <Text strong style={{ fontSize: '12px' }}>Quality: </Text>
            <Rate disabled allowHalf value={Number(stats.quality_average)} style={{ fontSize: '10px' }} />
            <Text style={{ fontSize: '12px', marginLeft: 4 }}>({Number(stats.quality_average).toFixed(1)})</Text>
          </div>
        )}
        <div style={{ marginBottom: 4 }}>
          <Text strong style={{ fontSize: '12px' }}>Ascents: </Text>
          <Text style={{ fontSize: '12px' }}>{stats.ascensionist_count}</Text>
        </div>
        {stats.fa_username && (
          <div style={{ marginBottom: 4 }}>
            <Text strong style={{ fontSize: '12px' }}>FA: </Text>
            <Text style={{ fontSize: '12px' }}>{stats.fa_username}</Text>
          </div>
        )}
        {stats.fa_at && (
          <div>
            <Text strong style={{ fontSize: '12px' }}>Date: </Text>
            <Text style={{ fontSize: '12px' }}>{new Date(stats.fa_at).toLocaleDateString()}</Text>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Button type="default" onClick={() => setIsDrawerOpen(true)} style={{ minWidth: '38px', padding: '4px 6px' }}>
        {currentAngle}°
      </Button>

      <Drawer
        title={currentClimb ? `Select Angle - ${currentClimb.name}` : "Select Angle"}
        placement="right"
        onClose={() => setIsDrawerOpen(false)}
        open={isDrawerOpen}
        width={350}
      >
        {currentClimb && isLoading && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <Spin size="large" />
            <div style={{ marginTop: 8 }}>
              <Text>Loading climb statistics...</Text>
            </div>
          </div>
        )}
        <Row gutter={[0, 16]}>
          {ANGLES[boardName].map((angle) => {
            const hasStats = currentClimb && statsMap.has(angle);
            return (
              <Col span={24} key={angle}>
                <Card
                  hoverable
                  onClick={() => handleAngleChange(angle)}
                  style={{
                    backgroundColor: angle === currentAngle ? '#e6f7ff' : undefined,
                    borderColor: angle === currentAngle ? '#1890ff' : undefined,
                    minHeight: currentClimb && !isLoading ? (hasStats ? '160px' : '60px') : '60px',
                  }}
                >
                  <div>
                    <Title level={4} style={{ margin: 0, marginBottom: hasStats ? 0 : 4 }}>
                      {angle}°
                    </Title>
                    {!currentClimb && (
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        Click to select this angle
                      </Text>
                    )}
                    {currentClimb && !hasStats && !isLoading && (
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        No data for this angle
                      </Text>
                    )}
                    {!isLoading && renderClimbStats(angle)}
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      </Drawer>
    </>
  );
}
