'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';

interface WsAuthResponse {
  token: string | null;
  authenticated: boolean;
  error?: string;
}

async function fetchWsAuthToken(): Promise<WsAuthResponse> {
  const response = await fetch('/api/internal/ws-auth');
  if (!response.ok) {
    throw new Error(`Failed to fetch auth token: ${response.status}`);
  }
  return response.json();
}

/**
 * Hook to get a WebSocket authentication token from the server.
 * Uses TanStack Query for deduplication and caching — all callers
 * share a single fetch via the shared query key.
 *
 * Includes the NextAuth session status in the query key so the token
 * is automatically re-fetched when the user logs in or out.
 */
export function useWsAuthToken() {
  const { status } = useSession();

  const { data, isLoading, error } = useQuery({
    queryKey: ['wsAuthToken', status],
    queryFn: fetchWsAuthToken,
    staleTime: Infinity,
    retry: 1,
    enabled: status !== 'loading',
  });

  return {
    token: data?.token ?? null,
    isAuthenticated: data?.authenticated ?? false,
    isLoading: isLoading || status === 'loading',
    error: error ? (error instanceof Error ? error.message : 'Unknown error') : (data?.error ?? null),
  };
}
