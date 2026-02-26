import React from 'react';
import Box from '@mui/material/Box';
import MuiCard from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';
import styles from './ascents-feed.module.css';

/**
 * Skeleton placeholder mimicking the SocialFeedItem card layout.
 * Used during initial load and pagination to avoid layout shift.
 */
export default function FeedItemSkeleton() {
  return (
    <MuiCard className={styles.feedItem}>
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        {/* User header row */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Skeleton variant="circular" width={32} height={32} animation="wave" />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Skeleton variant="rounded" width="60%" height={14} animation="wave" />
          </Box>
          <Skeleton variant="rounded" width="30%" height={12} animation="wave" />
        </Box>

        {/* Content row */}
        <Box sx={{ display: 'flex', gap: '12px' }}>
          {/* Thumbnail */}
          <Skeleton variant="rounded" width={64} height={64} animation="wave" sx={{ flexShrink: 0 }} />

          {/* Details */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: 0 }}>
            {/* Status and name chips */}
            <Box sx={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Skeleton variant="rounded" width={64} height={24} animation="wave" />
              <Skeleton variant="rounded" width={100} height={16} animation="wave" />
            </Box>

            {/* Difficulty / angle chips */}
            <Box sx={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Skeleton variant="rounded" width={40} height={24} animation="wave" />
              <Skeleton variant="rounded" width={48} height={24} animation="wave" />
              <Skeleton variant="rounded" width={60} height={14} animation="wave" />
            </Box>

            {/* Action row */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
              <Skeleton variant="circular" width={24} height={24} animation="wave" />
              <Skeleton variant="circular" width={24} height={24} animation="wave" />
            </Box>
          </Box>
        </Box>
      </CardContent>
    </MuiCard>
  );
}
