'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useWsAuthToken } from './use-ws-auth-token';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import {
  MARK_GROUP_NOTIFICATIONS_READ,
  MARK_ALL_NOTIFICATIONS_READ,
  type MarkGroupNotificationsReadMutationVariables,
  type MarkGroupNotificationsReadMutationResponse,
} from '@/app/lib/graphql/operations';
import type { GroupedNotification, GroupedNotificationConnection } from '@boardsesh/shared-schema';
import { UNREAD_COUNT_QUERY_KEY } from './use-unread-notification-count';
import { GROUPED_NOTIFICATIONS_QUERY_KEY } from './use-grouped-notifications';

/**
 * Hook to mark a notification group as read.
 */
export function useMarkGroupAsRead() {
  const { token } = useWsAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notification: GroupedNotification) => {
      const client = createGraphQLHttpClient(token!);
      const data = await client.request<
        MarkGroupNotificationsReadMutationResponse,
        MarkGroupNotificationsReadMutationVariables
      >(MARK_GROUP_NOTIFICATIONS_READ, {
        type: notification.type,
        entityType: notification.entityType,
        entityId: notification.entityId,
      });
      return data.markGroupNotificationsRead;
    },
    onSuccess: (markedCount, notification) => {
      // Update grouped notifications cache
      queryClient.setQueriesData<{ pages: GroupedNotificationConnection[]; pageParams: unknown[] }>(
        { queryKey: GROUPED_NOTIFICATIONS_QUERY_KEY },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              groups: page.groups.map((n) =>
                n.uuid === notification.uuid ? { ...n, isRead: true } : n,
              ),
            })),
          };
        },
      );

      // Update unread count
      queryClient.setQueryData<number>(UNREAD_COUNT_QUERY_KEY, (prev) =>
        Math.max(0, (prev ?? 0) - markedCount),
      );
    },
  });
}

/**
 * Hook to mark all notifications as read.
 */
export function useMarkAllAsRead() {
  const { token } = useWsAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const client = createGraphQLHttpClient(token!);
      await client.request(MARK_ALL_NOTIFICATIONS_READ);
    },
    onSuccess: () => {
      // Mark all groups as read in cache
      queryClient.setQueriesData<{ pages: GroupedNotificationConnection[]; pageParams: unknown[] }>(
        { queryKey: GROUPED_NOTIFICATIONS_QUERY_KEY },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              groups: page.groups.map((n) => ({ ...n, isRead: true })),
            })),
          };
        },
      );

      // Reset unread count
      queryClient.setQueryData(UNREAD_COUNT_QUERY_KEY, 0);
    },
  });
}
