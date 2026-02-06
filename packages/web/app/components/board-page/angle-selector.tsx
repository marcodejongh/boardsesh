'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button, Drawer, Spin, Typography, Flex, Row, Col, Card, Alert, message } from 'antd';
import { useRouter, usePathname } from 'next/navigation';
import { track } from '@vercel/analytics';
import useSWR from 'swr';
import { ANGLES } from '@/app/lib/board-data';
import { BoardName, Climb } from '@/app/lib/types';
import { ClimbStatsForAngle } from '@/app/lib/data/queries';
import { themeTokens } from '@/app/theme/theme-config';
import { usePersistentSession } from '../persistent-session/persistent-session-context';

const { Text } = Typography;

type AngleSelectorProps = {
  boardName: BoardName;
  currentAngle: number;
  currentClimb: Climb | null;
};

export default function AngleSelector({ boardName, currentAngle, currentClimb }: AngleSelectorProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const currentAngleRef = useRef<HTMLDivElement>(null);
  const { activeSession, updateSessionAngle } = usePersistentSession();

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

  // Scroll to current angle when drawer opens
  useEffect(() => {
    if (isDrawerOpen && currentAngleRef.current) {
      // Small delay to ensure drawer is fully rendered
      const timeoutId = setTimeout(() => {
        currentAngleRef.current?.scrollIntoView({
          behavior: 'instant',
          block: 'center',
        });
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [isDrawerOpen]);

  const handleAngleChange = async (newAngle: number) => {
    track('Angle Changed', {
      angle: newAngle,
      inSession: !!activeSession,
    });

    if (activeSession) {
      // In a session - use the mutation to update angle for all users
      // The URL will be updated by the AngleChanged event handler in PersistentSessionContext
      try {
        await updateSessionAngle(newAngle);
      } catch (error) {
        console.error('[AngleSelector] Failed to update session angle:', error);
        message.error('Failed to change angle. Please try again.');
        return; // Don't close drawer on error so user can retry
      }
    } else {
      // Not in a session - just update the URL locally
      const pathSegments = pathname.split('/');
      const angleIndex = pathSegments.findIndex((segment) => segment === currentAngle.toString());

      if (angleIndex !== -1) {
        pathSegments[angleIndex] = newAngle.toString();
        const newPath = pathSegments.join('/');
        router.push(newPath);
      }
    }

    setIsDrawerOpen(false);
  };

  const renderAngleCard = (angle: number) => {
    const stats = statsMap.get(angle);
    const isSelected = angle === currentAngle;
    const hasStats = currentClimb && stats;

    return (
      <Col xs={8} sm={6} md={4} key={angle}>
        <div ref={isSelected ? currentAngleRef : null}>
          <Card
            hoverable
            size="small"
            onClick={() => handleAngleChange(angle)}
            styles={{
              body: {
                padding: '12px 8px',
                minHeight: 80,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              },
            }}
            style={{
              backgroundColor: isSelected ? themeTokens.semantic.selected : undefined,
              borderColor: isSelected ? themeTokens.colors.primary : undefined,
              borderWidth: isSelected ? 2 : 1,
            }}
          >
            <Text strong style={{ fontSize: 20, lineHeight: 1.2 }}>
              {angle}°
            </Text>
            {hasStats && (
              <Flex vertical gap={2} align="center" style={{ marginTop: 4 }}>
                {stats.difficulty && (
                  <Text style={{ fontSize: 12, fontWeight: 500 }}>{stats.difficulty}</Text>
                )}
                <Flex gap={4} align="center" justify="center" wrap="wrap">
                  {stats.quality_average !== null && Number(stats.quality_average) > 0 && (
                    <Text style={{ fontSize: 11, color: themeTokens.colors.warning }}>
                      ★{Number(stats.quality_average).toFixed(1)}
                    </Text>
                  )}
                  <Text type="secondary" style={{ fontSize: 10 }}>
                    {stats.ascensionist_count} sends
                  </Text>
                </Flex>
              </Flex>
            )}
            {currentClimb && !hasStats && !isLoading && (
              <Text type="secondary" style={{ fontSize: 10, marginTop: 4 }}>
                No data
              </Text>
            )}
          </Card>
        </div>
      </Col>
    );
  };

  return (
    <>
      <Button type="default" onClick={() => setIsDrawerOpen(true)} style={{ minWidth: '38px', padding: '4px 6px' }}>
        {currentAngle}°
      </Button>

      <Drawer
        title="Select Angle"
        placement="right"
        onClose={() => setIsDrawerOpen(false)}
        open={isDrawerOpen}
        styles={{ wrapper: { width: '90%' }, body: { padding: 12 } }}
      >
        {currentClimb && (
          <Alert
            title={currentClimb.name}
            type="info"
            style={{ marginBottom: 12, textAlign: 'center' }}
          />
        )}
        {currentClimb && isLoading && (
          <Flex align="center" justify="center" gap={8} style={{ marginBottom: 12 }}>
            <Spin size="small" />
            <Text type="secondary" style={{ fontSize: 12 }}>Loading stats...</Text>
          </Flex>
        )}
        <Row gutter={[8, 8]}>
          {ANGLES[boardName].map(renderAngleCard)}
        </Row>
      </Drawer>
    </>
  );
}
