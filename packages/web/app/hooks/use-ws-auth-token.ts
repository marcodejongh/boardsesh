'use client';

import { useState, useEffect } from 'react';
import { useWsAuthContext } from '@/app/components/providers/ws-auth-provider';

interface WsAuthResponse {
  token: string | null;
  authenticated: boolean;
  error?: string;
}

/**
 * Hook to get a WebSocket authentication token from the server.
 * This token can be passed to the GraphQL WebSocket client for backend auth.
 *
 * When wrapped in a WsAuthProvider, returns the shared token (single fetch).
 * Otherwise falls back to fetching independently.
 */
export function useWsAuthToken() {
  const context = useWsAuthContext();

  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If context is available, skip the fetch entirely
    if (context) return;

    let mounted = true;

    async function fetchToken() {
      try {
        const response = await fetch('/api/internal/ws-auth');
        if (!response.ok) {
          throw new Error(`Failed to fetch auth token: ${response.status}`);
        }

        const data: WsAuthResponse = await response.json();

        if (mounted) {
          setToken(data.token);
          setIsAuthenticated(data.authenticated);
          setError(data.error || null);
          setIsLoading(false);
        }
      } catch (err) {
        if (mounted) {
          console.error('[useWsAuthToken] Error fetching token:', err);
          setError(err instanceof Error ? err.message : 'Unknown error');
          setIsLoading(false);
        }
      }
    }

    fetchToken();

    return () => {
      mounted = false;
    };
  }, [context]);

  // If context is available, use its values
  if (context) {
    return {
      token: context.token,
      isAuthenticated: context.isAuthenticated,
      isLoading: context.isLoading,
      error: context.error,
    };
  }

  // Fallback to local state
  return {
    token,
    isAuthenticated,
    isLoading,
    error,
  };
}
