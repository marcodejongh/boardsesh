'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button, Drawer, Spin, Typography, Flex } from 'antd';
import { useRouter, usePathname } from 'next/navigation';
import { track } from '@vercel/analytics';
import useSWR from 'swr';
import { ANGLES } from '@/app/lib/board-data';
import { BoardName, Climb } from '@/app/lib/types';
import { ClimbStatsForAngle } from '@/app/lib/data/queries';
import { themeTokens } from '@/app/theme/theme-config';
import styles from './angle-selector.module.css';

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
  const currentAngleRef = useRef<HTMLButtonElement>(null);

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

  const renderAngleButton = (angle: number) => {
    const stats = statsMap.get(angle);
    const isSelected = angle === currentAngle;
    const hasStats = currentClimb && stats;

    return (
      <button
        key={angle}
        ref={isSelected ? currentAngleRef : null}
        className={`${styles.angleButton} ${isSelected ? styles.angleButtonSelected : ''}`}
        onClick={() => handleAngleChange(angle)}
      >
        <Text strong className={styles.angleValue}>
          {angle}°
        </Text>
        {hasStats && (
          <Flex vertical gap={2} className={styles.statsContainer}>
            {stats.difficulty && (
              <Text className={styles.grade}>{stats.difficulty}</Text>
            )}
            <Flex gap={4} align="center" justify="center" wrap="wrap">
              {stats.quality_average !== null && Number(stats.quality_average) > 0 && (
                <Text className={styles.quality}>
                  ★{Number(stats.quality_average).toFixed(1)}
                </Text>
              )}
              <Text type="secondary" className={styles.ascents}>
                {stats.ascensionist_count} sends
              </Text>
            </Flex>
          </Flex>
        )}
        {currentClimb && !hasStats && !isLoading && (
          <Text type="secondary" className={styles.noData}>
            No data
          </Text>
        )}
      </button>
    );
  };

  return (
    <>
      <Button type="default" onClick={() => setIsDrawerOpen(true)} style={{ minWidth: '38px', padding: '4px 6px' }}>
        {currentAngle}°
      </Button>

      <Drawer
        title={currentClimb ? `Select Angle` : "Select Angle"}
        placement="right"
        onClose={() => setIsDrawerOpen(false)}
        open={isDrawerOpen}
        width={320}
        styles={{ body: { padding: '12px' } }}
      >
        {currentClimb && (
          <div className={styles.climbName}>
            <Text strong ellipsis>{currentClimb.name}</Text>
          </div>
        )}
        {currentClimb && isLoading && (
          <div className={styles.loadingContainer}>
            <Spin size="small" />
            <Text type="secondary" className={styles.loadingText}>Loading stats...</Text>
          </div>
        )}
        <div className={styles.anglesGrid}>
          {ANGLES[boardName].map(renderAngleButton)}
        </div>
      </Drawer>
    </>
  );
}
