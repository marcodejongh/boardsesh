'use client';

import { useQuery } from '@tanstack/react-query';
import { useWsAuthToken } from './use-ws-auth-token';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import {
  GET_UNREAD_NOTIFICATION_COUNT,
  type GetUnreadNotificationCountQueryResponse,
} from '@/app/lib/graphql/operations';

export const UNREAD_COUNT_QUERY_KEY = ['notifications', 'unreadCount'] as const;

/**
 * Hook to get the current unread notification count.
 * Automatically fetches and caches via TanStack Query.
 */
export function useUnreadNotificationCount() {
  const { token, isAuthenticated } = useWsAuthToken();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: UNREAD_COUNT_QUERY_KEY,
    queryFn: async () => {
      const client = createGraphQLHttpClient(token!);
      const data = await client.request<GetUnreadNotificationCountQueryResponse>(
        GET_UNREAD_NOTIFICATION_COUNT,
      );
      return data.unreadNotificationCount;
    },
    enabled: isAuthenticated && !!token,
    staleTime: 60 * 1000,
  });

  return unreadCount;
}
