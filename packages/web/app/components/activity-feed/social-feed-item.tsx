'use client';

import React from 'react';
import Box from '@mui/material/Box';
import MuiCard from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import MuiTypography from '@mui/material/Typography';
import MuiAvatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import PersonOutlined from '@mui/icons-material/PersonOutlined';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import ElectricBoltOutlined from '@mui/icons-material/ElectricBoltOutlined';
import CancelOutlined from '@mui/icons-material/CancelOutlined';
import LocationOnOutlined from '@mui/icons-material/LocationOnOutlined';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import type { FollowingAscentFeedItem } from '@boardsesh/shared-schema';
import AscentThumbnail from './ascent-thumbnail';
import VoteButton from '@/app/components/social/vote-button';
import { themeTokens } from '@/app/theme/theme-config';
import styles from './ascents-feed.module.css';

dayjs.extend(relativeTime);

// Layout name mapping (shared with ascents-feed.tsx)
const layoutNames: Record<string, string> = {
  'kilter-1': 'Kilter Original',
  'kilter-8': 'Kilter Homewall',
  'tension-9': 'Tension Classic',
  'tension-10': 'Tension 2 Mirror',
  'tension-11': 'Tension 2 Spray',
  'moonboard-1': 'MoonBoard 2010',
  'moonboard-2': 'MoonBoard 2016',
  'moonboard-3': 'MoonBoard 2024',
  'moonboard-4': 'MoonBoard Masters 2017',
  'moonboard-5': 'MoonBoard Masters 2019',
};

const getLayoutDisplayName = (boardType: string, layoutId: number | null): string => {
  if (layoutId === null) return boardType.charAt(0).toUpperCase() + boardType.slice(1);
  const key = `${boardType}-${layoutId}`;
  return layoutNames[key] || `${boardType.charAt(0).toUpperCase() + boardType.slice(1)}`;
};

const getStatusDisplay = (status: string) => {
  switch (status) {
    case 'flash':
      return { label: 'Flash', icon: <ElectricBoltOutlined />, color: themeTokens.colors.amber };
    case 'send':
      return { label: 'Send', icon: <CheckCircleOutlined />, chipColor: 'success' as const };
    case 'attempt':
      return { label: 'Attempt', icon: <CancelOutlined />, chipColor: undefined };
    default:
      return { label: status, icon: null, chipColor: undefined };
  }
};

interface SocialFeedItemProps {
  item: FollowingAscentFeedItem;
  showUserHeader?: boolean;
}

const SocialFeedItem: React.FC<SocialFeedItemProps> = ({ item, showUserHeader = false }) => {
  const timeAgo = dayjs(item.climbedAt).fromNow();
  const statusDisplay = getStatusDisplay(item.status);
  const boardDisplay = getLayoutDisplayName(item.boardType, item.layoutId ?? null);

  return (
    <MuiCard className={styles.feedItem}>
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        {/* User header */}
        {showUserHeader && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <MuiAvatar
              src={item.userAvatarUrl ?? undefined}
              sx={{ width: 32, height: 32 }}
              component="a"
              href={`/crusher/${item.userId}`}
            >
              {!item.userAvatarUrl && <PersonOutlined sx={{ fontSize: 16 }} />}
            </MuiAvatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <MuiTypography
                variant="body2"
                fontWeight={600}
                component="a"
                href={`/crusher/${item.userId}`}
                sx={{ textDecoration: 'none', color: 'text.primary' }}
              >
                {item.userDisplayName || 'User'}
              </MuiTypography>
              <MuiTypography variant="body2" component="span" color="text.secondary">
                {' '}climbed{' '}
              </MuiTypography>
              <MuiTypography variant="body2" component="span" fontWeight={600}>
                {item.climbName}
              </MuiTypography>
            </Box>
            <MuiTypography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
              {timeAgo}
            </MuiTypography>
          </Box>
        )}

        {/* Content row with thumbnail */}
        <Box sx={{ display: 'flex', gap: '12px' }}>
          {/* Thumbnail */}
          {item.frames && item.layoutId && (
            <AscentThumbnail
              boardType={item.boardType}
              layoutId={item.layoutId}
              angle={item.angle}
              climbUuid={item.climbUuid}
              climbName={item.climbName}
              frames={item.frames}
              isMirror={item.isMirror}
            />
          )}

          {/* Details */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }} className={styles.feedItemContent}>
            {/* Status and climb name row */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Chip
                  icon={statusDisplay.icon as React.ReactElement}
                  label={statusDisplay.label}
                  size="small"
                  color={statusDisplay.chipColor}
                  sx={statusDisplay.color ? { bgcolor: statusDisplay.color, color: themeTokens.neutral[900] } : undefined}
                  className={styles.statusTag}
                />
                {!showUserHeader && (
                  <MuiTypography variant="body2" component="span" fontWeight={600} className={styles.climbName}>
                    {item.climbName}
                  </MuiTypography>
                )}
              </Box>
              {!showUserHeader && (
                <MuiTypography variant="body2" component="span" color="text.secondary" className={styles.timeAgo}>
                  {timeAgo}
                </MuiTypography>
              )}
            </Box>

            {/* Climb details chips */}
            <Box sx={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              {item.difficultyName && (
                <Chip label={item.difficultyName} size="small" color="primary" />
              )}
              <Chip icon={<LocationOnOutlined />} label={`${item.angle}\u00B0`} size="small" />
              <MuiTypography variant="body2" component="span" color="text.secondary" className={styles.boardType}>
                {boardDisplay}
              </MuiTypography>
              {item.isMirror && <Chip label="Mirrored" size="small" color="secondary" />}
              {item.isBenchmark && <Chip label="Benchmark" size="small" />}
            </Box>

            {/* Comment */}
            {item.comment && (
              <MuiTypography variant="body2" component="span" className={styles.comment}>
                {item.comment}
              </MuiTypography>
            )}

            {/* Vote */}
            <Box sx={{ mt: 0.5 }}>
              <VoteButton entityType="tick" entityId={item.uuid} />
            </Box>
          </Box>
        </Box>
      </CardContent>
    </MuiCard>
  );
};

export default SocialFeedItem;
