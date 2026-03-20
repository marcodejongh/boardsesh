import { useState, useEffect, useRef } from 'react';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import { GET_MY_BOARDS, type GetMyBoardsQueryResponse } from '@/app/lib/graphql/operations';
import type { UserBoard } from '@boardsesh/shared-schema';

/**
 * Fetches the current user's boards (owned + followed) via GraphQL.
 * Boards are fetched when `enabled` becomes true and the user is authenticated.
 *
 * When `initialBoards` is provided (from SSR), they are used as the initial state
 * so the UI renders immediately without a loading skeleton. The client-side fetch
 * still runs to refresh the data.
 */
export function useMyBoards(enabled: boolean, limit = 50, initialBoards?: UserBoard[] | null) {
  const hasInitialData = initialBoards != null && initialBoards.length > 0;
  const { token, isAuthenticated } = useWsAuthToken();
  const [boards, setBoards] = useState<UserBoard[]>(initialBoards ?? []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track whether we already have data (from SSR or a prior fetch) to avoid
  // re-showing the loading skeleton on refetches. Using a ref instead of reading
  // `boards` state avoids adding it to the effect's dependency array.
  const hasDataRef = useRef(hasInitialData);

  useEffect(() => {
    if (!enabled || !isAuthenticated || !token) return;

    let cancelled = false;
    // Only show loading if we don't already have data
    if (!hasDataRef.current) {
      setIsLoading(true);
    }
    setError(null);

    const client = createGraphQLHttpClient(token);
    client
      .request<GetMyBoardsQueryResponse>(GET_MY_BOARDS, { input: { limit, offset: 0 } })
      .then((data) => {
        if (!cancelled) {
          setBoards(data.myBoards.boards);
          hasDataRef.current = true;
        }
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, isAuthenticated, token, limit]);

  return { boards, isLoading, error };
}
