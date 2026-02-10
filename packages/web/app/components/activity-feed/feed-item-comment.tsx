'use client';

import React from 'react';
import Box from '@mui/material/Box';
import MuiCard from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import MuiTypography from '@mui/material/Typography';
import MuiAvatar from '@mui/material/Avatar';
import PersonOutlined from '@mui/icons-material/PersonOutlined';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import type { ActivityFeedItem } from '@boardsesh/shared-schema';
import VoteButton from '@/app/components/social/vote-button';
import { themeTokens } from '@/app/theme/theme-config';
import styles from './ascents-feed.module.css';

dayjs.extend(relativeTime);

interface FeedItemCommentProps {
  item: ActivityFeedItem;
}

export default function FeedItemComment({ item }: FeedItemCommentProps) {
  const timeAgo = dayjs(item.createdAt).fromNow();

  return (
    <MuiCard className={styles.feedItem}>
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        {/* User header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <MuiAvatar
            src={item.actorAvatarUrl ?? undefined}
            sx={{ width: 32, height: 32 }}
            component="a"
            href={item.actorId ? `/crusher/${item.actorId}` : undefined}
          >
            {!item.actorAvatarUrl && <PersonOutlined sx={{ fontSize: 16 }} />}
          </MuiAvatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <MuiTypography
              variant="body2"
              fontWeight={600}
              component="a"
              href={item.actorId ? `/crusher/${item.actorId}` : undefined}
              sx={{ textDecoration: 'none', color: 'text.primary' }}
            >
              {item.actorDisplayName || 'User'}
            </MuiTypography>
            <MuiTypography variant="body2" component="span" color="text.secondary">
              {' '}commented
            </MuiTypography>
            {item.climbName && (
              <>
                <MuiTypography variant="body2" component="span" color="text.secondary">
                  {' '}on{' '}
                </MuiTypography>
                <MuiTypography variant="body2" component="span" fontWeight={600}>
                  {item.climbName}
                </MuiTypography>
              </>
            )}
          </Box>
          <MuiTypography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
            {timeAgo}
          </MuiTypography>
        </Box>

        {/* Quoted comment body */}
        {item.commentBody && (
          <Box
            sx={{
              bgcolor: themeTokens.neutral[50],
              borderLeft: `3px solid ${themeTokens.neutral[300]}`,
              borderRadius: 1,
              px: 1.5,
              py: 1,
              mb: 1,
            }}
          >
            <MuiTypography variant="body2" color="text.secondary">
              {item.commentBody}
            </MuiTypography>
          </Box>
        )}

        {/* Vote */}
        <Box sx={{ mt: 0.5 }}>
          <VoteButton entityType="comment" entityId={item.entityId} />
        </Box>
      </CardContent>
    </MuiCard>
  );
}
