'use client';

import React, { useState, useRef, useEffect } from 'react';
import MuiButton from '@mui/material/Button';
import MuiCard from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import SwipeableDrawer from '../swipeable-drawer/swipeable-drawer';
import { useRouter, usePathname } from 'next/navigation';
import { track } from '@vercel/analytics';
import useSWR from 'swr';
import { ANGLES } from '@/app/lib/board-data';
import { BoardName, BoardDetails, Climb } from '@/app/lib/types';
import { ClimbStatsForAngle } from '@/app/lib/data/queries';
import { themeTokens } from '@/app/theme/theme-config';
import DrawerClimbHeader from '../climb-card/drawer-climb-header';
import styles from './angle-selector.module.css';

type AngleSelectorProps = {
  boardName: BoardName;
  boardDetails: BoardDetails;
  currentAngle: number;
  currentClimb: Climb | null;
};

export default function AngleSelector({ boardName, boardDetails, currentAngle, currentClimb }: AngleSelectorProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const currentAngleRef = useRef<HTMLDivElement>(null);

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

  const renderAngleCard = (angle: number) => {
    const stats = statsMap.get(angle);
    const isSelected = angle === currentAngle;
    const hasStats = currentClimb && stats;

    return (
      <div key={angle} ref={isSelected ? currentAngleRef : null}>
        <MuiCard
          onClick={() => handleAngleChange(angle)}
          sx={{
            cursor: 'pointer',
            '&:hover': { boxShadow: 3 },
            backgroundColor: isSelected ? 'var(--semantic-selected)' : undefined,
            borderColor: isSelected ? themeTokens.colors.primary : undefined,
            borderWidth: isSelected ? 2 : 1,
            borderStyle: 'solid',
          }}
        >
          <CardContent
            sx={{
              p: '12px 8px',
              minHeight: 80,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              '&:last-child': { pb: '12px' },
            }}
          >
            <Typography variant="body2" component="span" fontWeight={600} sx={{ fontSize: 20, lineHeight: 1.2 }}>
              {angle}°
            </Typography>
            {hasStats && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center', marginTop: '4px' }}>
                {stats.difficulty && (
                  <Typography variant="body2" component="span" sx={{ fontSize: 12, fontWeight: 500 }}>{stats.difficulty}</Typography>
                )}
                <Box sx={{ display: 'flex', gap: '4px', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
                  {stats.quality_average !== null && Number(stats.quality_average) > 0 && (
                    <Typography variant="body2" component="span" sx={{ fontSize: 11, color: themeTokens.colors.warning }}>
                      ★{Number(stats.quality_average).toFixed(1)}
                    </Typography>
                  )}
                  <Typography variant="body2" component="span" color="text.secondary" sx={{ fontSize: 10 }}>
                    {stats.ascensionist_count} sends
                  </Typography>
                </Box>
              </Box>
            )}
            {currentClimb && !hasStats && !isLoading && (
              <Typography variant="body2" component="span" color="text.secondary" sx={{ fontSize: 10, marginTop: '4px' }}>
                No data
              </Typography>
            )}
          </CardContent>
        </MuiCard>
      </div>
    );
  };

  return (
    <>
      <MuiButton variant="text" className={styles.anglePill} onClick={() => setIsDrawerOpen(true)} sx={{ textTransform: 'none', minWidth: '38px', padding: '4px 6px' }}>
        {currentAngle}°
      </MuiButton>

      <SwipeableDrawer
        title="Select Angle"
        placement="right"
        onClose={() => setIsDrawerOpen(false)}
        open={isDrawerOpen}
        styles={{ wrapper: { width: '90%' }, body: { padding: 12 } }}
      >
        {currentClimb && (
          <Box sx={{ mb: 2, pb: 2, borderBottom: 1, borderColor: 'divider' }}>
            <DrawerClimbHeader climb={currentClimb} boardDetails={boardDetails} />
          </Box>
        )}
        {currentClimb && isLoading && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 2 }}>
            <CircularProgress size={20} />
            <Typography variant="body2" component="span" color="text.secondary" sx={{ fontSize: 12 }}>Loading stats...</Typography>
          </Box>
        )}
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: 'repeat(4, 1fr)', md: 'repeat(6, 1fr)' },
          gap: 1,
        }}>
          {ANGLES[boardName].map(renderAngleCard)}
        </Box>
      </SwipeableDrawer>
    </>
  );
}
