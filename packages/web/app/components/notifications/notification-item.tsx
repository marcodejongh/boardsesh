'use client';

import React from 'react';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Avatar from '@mui/material/Avatar';
import AvatarGroup from '@mui/material/AvatarGroup';
import MuiTypography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import PersonAddOutlined from '@mui/icons-material/PersonAddOutlined';
import ChatBubbleOutline from '@mui/icons-material/ChatBubbleOutline';
import ThumbUpOutlined from '@mui/icons-material/ThumbUpOutlined';
import LightbulbOutlined from '@mui/icons-material/LightbulbOutlined';
import AddCircleOutline from '@mui/icons-material/AddCircleOutline';
import type { GroupedNotification, NotificationType } from '@boardsesh/shared-schema';
import { themeTokens } from '@/app/theme/theme-config';

interface NotificationItemProps {
  notification: GroupedNotification;
  onClick: (notification: GroupedNotification) => void;
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

function getActorSummary(notification: GroupedNotification): string {
  const { actors, actorCount } = notification;
  if (actors.length === 0) return 'Someone';

  const firstActor = actors[0].displayName || 'Someone';

  if (actorCount === 1) return firstActor;

  if (actorCount === 2 && actors.length >= 2) {
    const secondActor = actors[1].displayName || 'someone';
    return `${firstActor} and ${secondActor}`;
  }

  const othersCount = actorCount - 1;
  return `${firstActor} and ${othersCount} other${othersCount > 1 ? 's' : ''}`;
}

function getNotificationText(notification: GroupedNotification): string {
  const actorSummary = getActorSummary(notification);
  switch (notification.type) {
    case 'new_follower':
      return `${actorSummary} started following you`;
    case 'comment_reply':
      return notification.commentBody
        ? `${actorSummary} replied: "${notification.commentBody}"`
        : `${actorSummary} replied to your comment`;
    case 'comment_on_tick':
      return notification.commentBody
        ? `${actorSummary} commented: "${notification.commentBody}"`
        : `${actorSummary} commented on your ascent`;
    case 'comment_on_climb':
      return notification.commentBody
        ? `${actorSummary} commented: "${notification.commentBody}"`
        : `${actorSummary} commented on a climb`;
    case 'vote_on_tick':
      return `${actorSummary} liked your ascent`;
    case 'vote_on_comment':
      return `${actorSummary} liked your comment`;
    case 'proposal_created':
      return `${actorSummary} created a new proposal`;
    case 'proposal_approved':
      return `${actorSummary}'s proposal was approved`;
    case 'proposal_rejected':
      return `${actorSummary}'s proposal was rejected`;
    case 'proposal_vote':
      return `${actorSummary} voted on your proposal`;
    case 'new_climb':
    case 'new_climb_global':
      return `${actorSummary} created a new climb`;
    default:
      return 'You have a new notification';
  }
}

function getNotificationIcon(type: NotificationType) {
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
    case 'proposal_created':
    case 'proposal_approved':
    case 'proposal_rejected':
    case 'proposal_vote':
      return <LightbulbOutlined fontSize="small" />;
    case 'new_climb':
    case 'new_climb_global':
      return <AddCircleOutline fontSize="small" />;
    default:
      return null;
  }
}

export default function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const { actors, actorCount } = notification;
  const showAvatarGroup = actorCount > 1 && actors.length > 1;

  return (
    <ListItem
      onClick={() => onClick(notification)}
      sx={{
        cursor: 'pointer',
        backgroundColor: notification.isRead ? 'transparent' : `${themeTokens.colors.primary}08`,
        '&:hover': { backgroundColor: 'var(--neutral-100)' },
        borderBottom: `1px solid var(--neutral-200)`,
        py: 1.5,
        px: 2,
      }}
    >
      <ListItemAvatar sx={{ minWidth: showAvatarGroup ? 56 : undefined }}>
        {showAvatarGroup ? (
          <AvatarGroup max={3} sx={{ '& .MuiAvatar-root': { width: 28, height: 28, fontSize: 12 } }}>
            {actors.map((actor) => (
              <Avatar
                key={actor.id}
                src={actor.avatarUrl || undefined}
              >
                {getNotificationIcon(notification.type)}
              </Avatar>
            ))}
          </AvatarGroup>
        ) : (
          <Avatar
            src={actors[0]?.avatarUrl || undefined}
            sx={{ width: 40, height: 40 }}
          >
            {getNotificationIcon(notification.type)}
          </Avatar>
        )}
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
