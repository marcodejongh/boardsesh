'use client';

import { useQuery } from '@tanstack/react-query';

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
 */
export function useWsAuthToken() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['wsAuthToken'],
    queryFn: fetchWsAuthToken,
    staleTime: Infinity,
    retry: 1,
  });

  return {
    token: data?.token ?? null,
    isAuthenticated: data?.authenticated ?? false,
    isLoading,
    error: error ? (error instanceof Error ? error.message : 'Unknown error') : (data?.error ?? null),
  };
}
