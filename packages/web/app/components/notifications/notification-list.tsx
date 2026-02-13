'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import MuiButton from '@mui/material/Button';
import MuiTypography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import NotificationsNoneOutlined from '@mui/icons-material/NotificationsNoneOutlined';
import { useRouter } from 'next/navigation';
import type { GroupedNotification } from '@boardsesh/shared-schema';
import { useNotifications } from '@/app/components/providers/notification-provider';
import { useInfiniteScroll } from '@/app/hooks/use-infinite-scroll';
import NotificationItem from './notification-item';

const PAGE_SIZE = 20;

export default function NotificationList() {
  const { groupedNotifications, fetchGroupedNotifications, markGroupAsRead, markAllAsRead, unreadCount } = useNotifications();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsLoading(true);
    fetchGroupedNotifications(PAGE_SIZE, 0)
      .then((result) => {
        if (result) {
          setHasMore(result.hasMore);
        }
      })
      .finally(() => setIsLoading(false));
  }, [fetchGroupedNotifications]);

  const handleLoadMore = useCallback(async () => {
    setIsLoadingMore(true);
    const result = await fetchGroupedNotifications(PAGE_SIZE, groupedNotifications.length);
    if (result) {
      setHasMore(result.hasMore);
    }
    setIsLoadingMore(false);
  }, [fetchGroupedNotifications, groupedNotifications.length]);

  const handleNotificationClick = useCallback(
    (notification: GroupedNotification) => {
      if (!notification.isRead) {
        markGroupAsRead(notification);
      }

      // Navigate based on notification type
      if (notification.climbUuid && notification.boardType) {
        // Navigate to climb - for now just go to the board page
        // TODO: construct full climb URL when available
      } else if (notification.type === 'new_follower' && notification.actors.length > 0) {
        router.push(`/profile/${notification.actors[0].id}`);
      }
    },
    [markGroupAsRead, router],
  );

  const sentinelRef = useInfiniteScroll({
    onLoadMore: handleLoadMore,
    hasMore,
    isLoading: isLoadingMore,
  });

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
      {groupedNotifications.length > 0 && unreadCount > 0 && (
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
      {groupedNotifications.length === 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, gap: 1 }}>
          <NotificationsNoneOutlined sx={{ fontSize: 40, color: 'var(--neutral-300)' }} />
          <MuiTypography variant="body2" color="text.secondary">
            No notifications yet
          </MuiTypography>
        </Box>
      ) : (
        <List disablePadding>
          {groupedNotifications.map((notification) => (
            <NotificationItem
              key={notification.uuid}
              notification={notification}
              onClick={handleNotificationClick}
            />
          ))}
        </List>
      )}

      {/* Infinite scroll sentinel */}
      {hasMore && (
        <Box ref={sentinelRef} sx={{ display: 'flex', justifyContent: 'center', py: 2, minHeight: 20 }}>
          {isLoadingMore && <CircularProgress size={16} />}
        </Box>
      )}
    </Box>
  );
}
