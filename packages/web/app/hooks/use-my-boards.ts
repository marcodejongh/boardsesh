import { useState, useEffect } from 'react';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import { GET_MY_BOARDS, type GetMyBoardsQueryResponse } from '@/app/lib/graphql/operations';
import type { UserBoard } from '@boardsesh/shared-schema';

/**
 * Fetches the current user's boards (owned + followed) via GraphQL.
 * Boards are fetched when `enabled` becomes true and the user is authenticated.
 */
export function useMyBoards(enabled: boolean, limit = 50) {
  const { token, isAuthenticated } = useWsAuthToken();
  const [boards, setBoards] = useState<UserBoard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !isAuthenticated || !token) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const client = createGraphQLHttpClient(token);
    client
      .request<GetMyBoardsQueryResponse>(GET_MY_BOARDS, { input: { limit, offset: 0 } })
      .then((data) => {
        if (!cancelled) setBoards(data.myBoards.boards);
      })
      .catch((err) => {
        console.error('Failed to fetch boards:', err);
        if (!cancelled) setError('Failed to load your boards');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, isAuthenticated, token, limit]);

  return { boards, isLoading, error };
}
