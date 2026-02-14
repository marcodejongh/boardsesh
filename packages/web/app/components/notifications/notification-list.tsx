'use client';

import React, { useCallback, useRef, useEffect } from 'react';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import MuiButton from '@mui/material/Button';
import MuiTypography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import NotificationsNoneOutlined from '@mui/icons-material/NotificationsNoneOutlined';
import { useRouter } from 'next/navigation';
import type { GroupedNotification } from '@boardsesh/shared-schema';
import { useUnreadNotificationCount } from '@/app/hooks/use-unread-notification-count';
import { useGroupedNotifications } from '@/app/hooks/use-grouped-notifications';
import { useMarkGroupAsRead, useMarkAllAsRead } from '@/app/hooks/use-mark-notifications-read';
import NotificationItem from './notification-item';

export default function NotificationList() {
  const unreadCount = useUnreadNotificationCount();
  const { groupedNotifications, isLoading, hasMore, isFetchingMore, fetchMore } = useGroupedNotifications();
  const markGroupAsReadMutation = useMarkGroupAsRead();
  const markAllAsReadMutation = useMarkAllAsRead();
  const router = useRouter();

  const handleLoadMore = useCallback(() => {
    if (hasMore && !isFetchingMore) {
      fetchMore();
    }
  }, [hasMore, isFetchingMore, fetchMore]);

  const navigateToClimb = useCallback(
    async (boardType: string, climbUuid: string, proposalUuid?: string | null) => {
      try {
        const params = new URLSearchParams({ boardType, climbUuid });
        if (proposalUuid) params.set('proposalUuid', proposalUuid);
        const res = await fetch(`/api/internal/climb-redirect?${params}`);
        if (!res.ok) return;
        const { url } = await res.json();
        if (url) router.push(url);
      } catch {
        // Silently fail navigation
      }
    },
    [router],
  );

  const handleNotificationClick = useCallback(
    (notification: GroupedNotification) => {
      if (!notification.isRead) {
        markGroupAsReadMutation.mutate(notification);
      }

      // Navigate based on notification type
      if (notification.type === 'new_follower' && notification.actors.length > 0) {
        router.push(`/profile/${notification.actors[0].id}`);
      } else if (notification.climbUuid && notification.boardType) {
        navigateToClimb(notification.boardType, notification.climbUuid, notification.proposalUuid);
      }
    },
    [markGroupAsReadMutation, router, navigateToClimb],
  );

  // Inline IntersectionObserver — same pattern as climbs-list.tsx
  const sentinelRef = useRef<HTMLDivElement>(null);
  const handleLoadMoreRef = useRef(handleLoadMore);
  const hasMoreRef = useRef(hasMore);
  const isFetchingMoreRef = useRef(isFetchingMore);
  handleLoadMoreRef.current = handleLoadMore;
  hasMoreRef.current = hasMore;
  isFetchingMoreRef.current = isFetchingMore;

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && hasMoreRef.current && !isFetchingMoreRef.current) {
        handleLoadMoreRef.current();
      }
    },
    [],
  );

  useEffect(() => {
    const element = sentinelRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: '200px',
      threshold: 0,
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [handleObserver]);

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
            onClick={() => markAllAsReadMutation.mutate()}
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
          {isFetchingMore && <CircularProgress size={16} />}
        </Box>
      )}
    </Box>
  );
}
