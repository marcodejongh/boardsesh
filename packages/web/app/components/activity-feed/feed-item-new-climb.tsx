'use client';

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import MuiCard from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import MuiTypography from '@mui/material/Typography';
import MuiAvatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import PersonOutlined from '@mui/icons-material/PersonOutlined';
import LocationOnOutlined from '@mui/icons-material/LocationOnOutlined';
import ChatBubbleOutlineOutlined from '@mui/icons-material/ChatBubbleOutlineOutlined';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import type { ActivityFeedItem } from '@boardsesh/shared-schema';
import AscentThumbnail from './ascent-thumbnail';
import VoteButton from '@/app/components/social/vote-button';
import CommentSection from '@/app/components/social/comment-section';
import { themeTokens } from '@/app/theme/theme-config';
import styles from './ascents-feed.module.css';

dayjs.extend(relativeTime);

interface FeedItemNewClimbProps {
  item: ActivityFeedItem;
}

export default function FeedItemNewClimb({ item }: FeedItemNewClimbProps) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const timeAgo = dayjs(item.createdAt).fromNow();

  return (
    <MuiCard className={styles.feedItem} data-testid="activity-feed-item">
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
              {' '}created a new climb{' '}
            </MuiTypography>
            <MuiTypography variant="body2" component="span" fontWeight={600}>
              {item.climbName}
            </MuiTypography>
          </Box>
          <MuiTypography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
            {timeAgo}
          </MuiTypography>
        </Box>

        {/* Content row with thumbnail */}
        <Box sx={{ display: 'flex', gap: '12px' }}>
          {item.frames && item.layoutId && (
            <AscentThumbnail
              boardType={item.boardType || ''}
              layoutId={item.layoutId}
              angle={item.angle || 0}
              climbUuid={item.climbUuid || ''}
              climbName={item.climbName || ''}
              frames={item.frames}
              isMirror={item.isMirror ?? false}
            />
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }} className={styles.feedItemContent}>
            <Box sx={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              {item.difficultyName && (
                <Chip label={item.difficultyName} size="small" color="primary" />
              )}
              {item.angle != null && (
                <Chip icon={<LocationOnOutlined />} label={`${item.angle}\u00B0`} size="small" />
              )}
              {item.boardType && (
                <MuiTypography variant="body2" component="span" color="text.secondary" className={styles.boardType}>
                  {item.boardType.charAt(0).toUpperCase() + item.boardType.slice(1)}
                </MuiTypography>
              )}
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
              <VoteButton entityType="climb" entityId={item.climbUuid || item.entityId} likeOnly />
              <IconButton
                size="small"
                onClick={() => setCommentsOpen((prev) => !prev)}
                sx={{ color: commentsOpen ? themeTokens.colors.primary : 'text.secondary' }}
              >
                <ChatBubbleOutlineOutlined fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </Box>

        {/* Comments */}
        <Collapse in={commentsOpen} unmountOnExit>
          <Box sx={{ mt: 1 }}>
            <CommentSection entityType="climb" entityId={item.climbUuid || item.entityId} title="Comments" />
          </Box>
        </Collapse>
      </CardContent>
    </MuiCard>
  );
}
