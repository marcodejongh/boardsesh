'use client';

import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useWsAuthToken } from './use-ws-auth-token';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import {
  GET_GROUPED_NOTIFICATIONS,
  type GetGroupedNotificationsQueryResponse,
  type GetGroupedNotificationsQueryVariables,
} from '@/app/lib/graphql/operations';
import type { GroupedNotification, GroupedNotificationConnection } from '@boardsesh/shared-schema';
import { UNREAD_COUNT_QUERY_KEY } from './use-unread-notification-count';

const PAGE_SIZE = 20;

export const GROUPED_NOTIFICATIONS_QUERY_KEY = ['notifications', 'grouped'] as const;

/**
 * Hook to fetch paginated grouped notifications using useInfiniteQuery.
 */
export function useGroupedNotifications() {
  const { token, isAuthenticated } = useWsAuthToken();
  const queryClient = useQueryClient();

  const query = useInfiniteQuery<GroupedNotificationConnection>({
    queryKey: GROUPED_NOTIFICATIONS_QUERY_KEY,
    queryFn: async ({ pageParam }) => {
      const client = createGraphQLHttpClient(token!);
      const data = await client.request<
        GetGroupedNotificationsQueryResponse,
        GetGroupedNotificationsQueryVariables
      >(GET_GROUPED_NOTIFICATIONS, { limit: PAGE_SIZE, offset: pageParam as number });

      // Sync unread count from the grouped response
      queryClient.setQueryData(UNREAD_COUNT_QUERY_KEY, data.groupedNotifications.unreadCount);

      return data.groupedNotifications;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined;
      return allPages.reduce((sum, page) => sum + page.groups.length, 0);
    },
    enabled: isAuthenticated && !!token,
    staleTime: 60 * 1000,
  });

  const groupedNotifications: GroupedNotification[] = useMemo(
    () => query.data?.pages.flatMap((page) => page.groups) ?? [],
    [query.data],
  );

  return {
    groupedNotifications,
    isLoading: query.isLoading,
    hasMore: query.hasNextPage ?? false,
    isFetchingMore: query.isFetchingNextPage,
    fetchMore: query.fetchNextPage,
  };
}
