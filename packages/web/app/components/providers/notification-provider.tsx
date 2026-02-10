'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { Notification } from '@boardsesh/shared-schema';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { useSnackbar } from '@/app/components/providers/snackbar-provider';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import { createGraphQLClient, subscribe } from '@/app/components/graphql-queue/graphql-client';
import {
  GET_NOTIFICATIONS,
  GET_UNREAD_NOTIFICATION_COUNT,
  MARK_NOTIFICATION_READ,
  MARK_ALL_NOTIFICATIONS_READ,
  NOTIFICATION_RECEIVED_SUBSCRIPTION,
  type GetNotificationsQueryResponse,
  type GetNotificationsQueryVariables,
  type GetUnreadNotificationCountQueryResponse,
  type MarkNotificationReadMutationVariables,
  type NotificationReceivedSubscriptionResponse,
} from '@/app/lib/graphql/operations';

interface NotificationContextValue {
  unreadCount: number;
  notifications: Notification[];
  isLoading: boolean;
  fetchNotifications: (unreadOnly?: boolean, limit?: number, offset?: number) => Promise<{
    notifications: Notification[];
    totalCount: number;
    unreadCount: number;
    hasMore: boolean;
  } | null>;
  markAsRead: (uuid: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue>({
  unreadCount: 0,
  notifications: [],
  isLoading: true,
  fetchNotifications: async () => null,
  markAsRead: async () => {},
  markAllAsRead: async () => {},
});

export function useNotifications() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { token, isAuthenticated } = useWsAuthToken();
  const { showMessage } = useSnackbar();
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const clientRef = useRef<ReturnType<typeof createGraphQLClient> | null>(null);

  // Fetch initial unread count
  useEffect(() => {
    if (!isAuthenticated || !token) {
      setIsLoading(false);
      return;
    }

    const fetchCount = async () => {
      try {
        const client = createGraphQLHttpClient(token);
        const data = await client.request<GetUnreadNotificationCountQueryResponse>(
          GET_UNREAD_NOTIFICATION_COUNT,
        );
        setUnreadCount(data.unreadNotificationCount);
      } catch {
        // Silently fail for initial count fetch
      } finally {
        setIsLoading(false);
      }
    };

    fetchCount();
  }, [isAuthenticated, token]);

  // Re-fetch unread count (used on reconnect to catch missed notifications)
  const refreshUnreadCount = useCallback(async () => {
    if (!token) return;
    try {
      const client = createGraphQLHttpClient(token);
      const data = await client.request<GetUnreadNotificationCountQueryResponse>(
        GET_UNREAD_NOTIFICATION_COUNT,
      );
      setUnreadCount(data.unreadNotificationCount);
    } catch {
      // Silently fail
    }
  }, [token]);

  // Set up WebSocket subscription for real-time notifications
  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
    if (!wsUrl) return;

    const wsClient = createGraphQLClient({
      url: wsUrl,
      authToken: token,
      onReconnect: () => {
        // Re-fetch count to catch any notifications missed during disconnection
        refreshUnreadCount();
      },
    });
    clientRef.current = wsClient;

    const unsub = subscribe<NotificationReceivedSubscriptionResponse>(
      wsClient,
      { query: NOTIFICATION_RECEIVED_SUBSCRIPTION },
      {
        next: (data) => {
          if (data?.notificationReceived?.notification) {
            const notification = data.notificationReceived.notification;
            setNotifications((prev) => [notification, ...prev]);
            setUnreadCount((prev) => prev + 1);
            showMessage(formatNotificationMessage(notification), 'info');
          }
        },
        error: (err) => {
          console.error('[Notifications] Subscription error:', err);
        },
        complete: () => {
          // Subscription ended
        },
      },
    );

    unsubscribeRef.current = unsub;

    return () => {
      unsub();
      wsClient.dispose();
      clientRef.current = null;
      unsubscribeRef.current = null;
    };
  }, [isAuthenticated, token, showMessage, refreshUnreadCount]);

  const fetchNotifications = useCallback(
    async (unreadOnly?: boolean, limit = 20, offset = 0) => {
      if (!token) return null;

      try {
        const client = createGraphQLHttpClient(token);
        const data = await client.request<GetNotificationsQueryResponse, GetNotificationsQueryVariables>(
          GET_NOTIFICATIONS,
          { unreadOnly, limit, offset },
        );

        if (offset === 0) {
          setNotifications(data.notifications.notifications);
        } else {
          setNotifications((prev) => [...prev, ...data.notifications.notifications]);
        }
        setUnreadCount(data.notifications.unreadCount);

        return data.notifications;
      } catch {
        return null;
      }
    },
    [token],
  );

  const markAsRead = useCallback(
    async (uuid: string) => {
      if (!token) return;

      try {
        const client = createGraphQLHttpClient(token);
        await client.request<{ markNotificationRead: boolean }, MarkNotificationReadMutationVariables>(
          MARK_NOTIFICATION_READ,
          { notificationUuid: uuid },
        );

        setNotifications((prev) =>
          prev.map((n) => (n.uuid === uuid ? { ...n, isRead: true } : n)),
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // Silently fail
      }
    },
    [token],
  );

  const markAllAsRead = useCallback(async () => {
    if (!token) return;

    try {
      const client = createGraphQLHttpClient(token);
      await client.request(MARK_ALL_NOTIFICATIONS_READ);

      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // Silently fail
    }
  }, [token]);

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        notifications,
        isLoading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

function formatNotificationMessage(notification: Notification): string {
  const actor = notification.actorDisplayName || 'Someone';
  switch (notification.type) {
    case 'new_follower':
      return `${actor} started following you`;
    case 'comment_reply':
      return `${actor} replied to your comment`;
    case 'comment_on_tick':
      return `${actor} commented on your ascent`;
    case 'comment_on_climb':
      return `${actor} commented on a climb`;
    case 'vote_on_tick':
      return `${actor} liked your ascent`;
    case 'vote_on_comment':
      return `${actor} liked your comment`;
    default:
      return 'You have a new notification';
  }
}
