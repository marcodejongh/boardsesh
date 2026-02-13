'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { Notification, GroupedNotification, GroupedNotificationConnection } from '@boardsesh/shared-schema';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { useSnackbar } from '@/app/components/providers/snackbar-provider';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import { createGraphQLClient, subscribe } from '@/app/components/graphql-queue/graphql-client';
import {
  GET_GROUPED_NOTIFICATIONS,
  GET_UNREAD_NOTIFICATION_COUNT,
  MARK_GROUP_NOTIFICATIONS_READ,
  MARK_ALL_NOTIFICATIONS_READ,
  NOTIFICATION_RECEIVED_SUBSCRIPTION,
  type GetGroupedNotificationsQueryResponse,
  type GetGroupedNotificationsQueryVariables,
  type GetUnreadNotificationCountQueryResponse,
  type MarkGroupNotificationsReadMutationVariables,
  type MarkGroupNotificationsReadMutationResponse,
  type NotificationReceivedSubscriptionResponse,
} from '@/app/lib/graphql/operations';

interface NotificationContextValue {
  unreadCount: number;
  groupedNotifications: GroupedNotification[];
  isLoading: boolean;
  fetchGroupedNotifications: (limit?: number, offset?: number) => Promise<GroupedNotificationConnection | null>;
  markGroupAsRead: (notification: GroupedNotification) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue>({
  unreadCount: 0,
  groupedNotifications: [],
  isLoading: true,
  fetchGroupedNotifications: async () => null,
  markGroupAsRead: async () => {},
  markAllAsRead: async () => {},
});

export function useNotifications() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [groupedNotifications, setGroupedNotifications] = useState<GroupedNotification[]>([]);
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
    } catch (err) {
      console.error('[Notifications] Failed to refresh unread count:', err);
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
            setUnreadCount((prev) => prev + 1);
            showMessage(formatNotificationMessage(notification), 'info');

            // Merge into grouped notifications: find matching group or prepend new one
            setGroupedNotifications((prev) => {
              const matchIdx = prev.findIndex(
                (g) =>
                  g.type === notification.type &&
                  g.entityType === notification.entityType &&
                  g.entityId === notification.entityId,
              );

              if (matchIdx >= 0) {
                // Update existing group: increment count, add actor if new, update timestamp
                const existing = prev[matchIdx];
                const actorAlreadyPresent = existing.actors.some(
                  (a) => a.id === notification.actorId,
                );
                const updatedGroup: GroupedNotification = {
                  ...existing,
                  uuid: notification.uuid,
                  actorCount: actorAlreadyPresent ? existing.actorCount : existing.actorCount + 1,
                  actors: actorAlreadyPresent
                    ? existing.actors
                    : [
                        {
                          id: notification.actorId || '',
                          displayName: notification.actorDisplayName,
                          avatarUrl: notification.actorAvatarUrl,
                        },
                        ...existing.actors,
                      ].slice(0, 3),
                  isRead: false,
                  createdAt: notification.createdAt,
                  commentBody: notification.commentBody || existing.commentBody,
                };
                // Move to top
                const newList = [...prev];
                newList.splice(matchIdx, 1);
                return [updatedGroup, ...newList];
              }

              // No matching group — prepend new one
              const newGroup: GroupedNotification = {
                uuid: notification.uuid,
                type: notification.type,
                entityType: notification.entityType,
                entityId: notification.entityId,
                actorCount: 1,
                actors: notification.actorId
                  ? [
                      {
                        id: notification.actorId,
                        displayName: notification.actorDisplayName,
                        avatarUrl: notification.actorAvatarUrl,
                      },
                    ]
                  : [],
                commentBody: notification.commentBody,
                climbName: notification.climbName,
                climbUuid: notification.climbUuid,
                boardType: notification.boardType,
                isRead: false,
                createdAt: notification.createdAt,
              };
              return [newGroup, ...prev];
            });
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

  const fetchGroupedNotifications = useCallback(
    async (limit = 20, offset = 0) => {
      if (!token) return null;

      try {
        const client = createGraphQLHttpClient(token);
        const data = await client.request<
          GetGroupedNotificationsQueryResponse,
          GetGroupedNotificationsQueryVariables
        >(GET_GROUPED_NOTIFICATIONS, { limit, offset });

        if (offset === 0) {
          setGroupedNotifications(data.groupedNotifications.groups);
        } else {
          setGroupedNotifications((prev) => [...prev, ...data.groupedNotifications.groups]);
        }
        setUnreadCount(data.groupedNotifications.unreadCount);

        return data.groupedNotifications;
      } catch (err) {
        console.error('[Notifications] Failed to fetch grouped notifications:', err);
        return null;
      }
    },
    [token],
  );

  const markGroupAsRead = useCallback(
    async (notification: GroupedNotification) => {
      if (!token) return;

      try {
        const client = createGraphQLHttpClient(token);
        const data = await client.request<
          MarkGroupNotificationsReadMutationResponse,
          MarkGroupNotificationsReadMutationVariables
        >(MARK_GROUP_NOTIFICATIONS_READ, {
          type: notification.type,
          entityType: notification.entityType,
          entityId: notification.entityId,
        });

        const markedCount = data.markGroupNotificationsRead;

        setGroupedNotifications((prev) =>
          prev.map((n) => (n.uuid === notification.uuid ? { ...n, isRead: true } : n)),
        );
        setUnreadCount((prev) => Math.max(0, prev - markedCount));
      } catch (err) {
        console.error('[Notifications] Failed to mark group as read:', err);
      }
    },
    [token],
  );

  const markAllAsRead = useCallback(async () => {
    if (!token) return;

    try {
      const client = createGraphQLHttpClient(token);
      await client.request(MARK_ALL_NOTIFICATIONS_READ);

      setGroupedNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('[Notifications] Failed to mark all as read:', err);
    }
  }, [token]);

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        groupedNotifications,
        isLoading,
        fetchGroupedNotifications,
        markGroupAsRead,
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
