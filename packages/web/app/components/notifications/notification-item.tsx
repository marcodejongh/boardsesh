'use client';

import React from 'react';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Avatar from '@mui/material/Avatar';
import MuiTypography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import PersonAddOutlined from '@mui/icons-material/PersonAddOutlined';
import ChatBubbleOutline from '@mui/icons-material/ChatBubbleOutline';
import ThumbUpOutlined from '@mui/icons-material/ThumbUpOutlined';
import type { Notification } from '@boardsesh/shared-schema';
import { themeTokens } from '@/app/theme/theme-config';

interface NotificationItemProps {
  notification: Notification;
  onClick: (notification: Notification) => void;
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString();
}

function getNotificationText(notification: Notification): string {
  const actor = notification.actorDisplayName || 'Someone';
  switch (notification.type) {
    case 'new_follower':
      return `${actor} started following you`;
    case 'comment_reply':
      return notification.commentBody
        ? `${actor} replied: "${notification.commentBody}"`
        : `${actor} replied to your comment`;
    case 'comment_on_tick':
      return notification.commentBody
        ? `${actor} commented: "${notification.commentBody}"`
        : `${actor} commented on your ascent`;
    case 'comment_on_climb':
      return notification.commentBody
        ? `${actor} commented: "${notification.commentBody}"`
        : `${actor} commented on a climb`;
    case 'vote_on_tick':
      return `${actor} liked your ascent`;
    case 'vote_on_comment':
      return `${actor} liked your comment`;
    default:
      return 'You have a new notification';
  }
}

function getNotificationIcon(type: Notification['type']) {
  switch (type) {
    case 'new_follower':
      return <PersonAddOutlined fontSize="small" />;
    case 'comment_reply':
    case 'comment_on_tick':
    case 'comment_on_climb':
      return <ChatBubbleOutline fontSize="small" />;
    case 'vote_on_tick':
    case 'vote_on_comment':
      return <ThumbUpOutlined fontSize="small" />;
    default:
      return null;
  }
}

export default function NotificationItem({ notification, onClick }: NotificationItemProps) {
  return (
    <ListItem
      onClick={() => onClick(notification)}
      sx={{
        cursor: 'pointer',
        backgroundColor: notification.isRead ? 'transparent' : `${themeTokens.colors.primary}08`,
        '&:hover': { backgroundColor: themeTokens.neutral[100] },
        borderBottom: `1px solid ${themeTokens.neutral[200]}`,
        py: 1.5,
        px: 2,
      }}
    >
      <ListItemAvatar>
        <Avatar
          src={notification.actorAvatarUrl || undefined}
          sx={{ width: 40, height: 40 }}
        >
          {getNotificationIcon(notification.type)}
        </Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={
          <MuiTypography
            variant="body2"
            sx={{
              fontWeight: notification.isRead ? 400 : 600,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {getNotificationText(notification)}
          </MuiTypography>
        }
        secondary={
          <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
            <MuiTypography variant="caption" color="text.secondary">
              {formatTimeAgo(notification.createdAt)}
            </MuiTypography>
            {!notification.isRead && (
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: themeTokens.colors.primary,
                  ml: 0.5,
                }}
              />
            )}
          </Box>
        }
      />
    </ListItem>
  );
}
