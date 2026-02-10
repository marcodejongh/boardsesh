'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import MuiButton from '@mui/material/Button';
import MuiTypography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import NotificationsNoneOutlined from '@mui/icons-material/NotificationsNoneOutlined';
import { useRouter } from 'next/navigation';
import type { Notification } from '@boardsesh/shared-schema';
import { useNotifications } from '@/app/components/providers/notification-provider';
import NotificationItem from './notification-item';

const PAGE_SIZE = 20;

export default function NotificationList() {
  const { notifications, fetchNotifications, markAsRead, markAllAsRead, unreadCount } = useNotifications();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsLoading(true);
    fetchNotifications(false, PAGE_SIZE, 0)
      .then((result) => {
        if (result) {
          setHasMore(result.hasMore);
        }
      })
      .finally(() => setIsLoading(false));
  }, [fetchNotifications]);

  const handleLoadMore = useCallback(async () => {
    setIsLoadingMore(true);
    const result = await fetchNotifications(false, PAGE_SIZE, notifications.length);
    if (result) {
      setHasMore(result.hasMore);
    }
    setIsLoadingMore(false);
  }, [fetchNotifications, notifications.length]);

  const handleNotificationClick = useCallback(
    (notification: Notification) => {
      if (!notification.isRead) {
        markAsRead(notification.uuid);
      }

      // Navigate based on notification type
      if (notification.climbUuid && notification.boardType) {
        // Navigate to climb - for now just go to the board page
        // TODO: construct full climb URL when available
      } else if (notification.type === 'new_follower' && notification.actorId) {
        router.push(`/profile/${notification.actorId}`);
      }
    },
    [markAsRead, router],
  );

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header with mark all as read */}
      {notifications.length > 0 && unreadCount > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 2, py: 1 }}>
          <MuiButton
            onClick={markAllAsRead}
            size="small"
            sx={{ textTransform: 'none' }}
          >
            Mark all as read
          </MuiButton>
        </Box>
      )}

      {/* Notification list */}
      {notifications.length === 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, gap: 1 }}>
          <NotificationsNoneOutlined sx={{ fontSize: 40, color: 'var(--neutral-300)' }} />
          <MuiTypography variant="body2" color="text.secondary">
            No notifications yet
          </MuiTypography>
        </Box>
      ) : (
        <List disablePadding>
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.uuid}
              notification={notification}
              onClick={handleNotificationClick}
            />
          ))}
        </List>
      )}

      {/* Load more */}
      {hasMore && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <MuiButton
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            size="small"
            sx={{ textTransform: 'none' }}
          >
            {isLoadingMore ? <CircularProgress size={16} /> : 'Load more'}
          </MuiButton>
        </Box>
      )}
    </Box>
  );
}
