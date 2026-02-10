'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type WsAuthContextValue = {
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
};

const WsAuthContext = createContext<WsAuthContextValue | null>(null);

export const useWsAuthContext = () => useContext(WsAuthContext);

export function WsAuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchToken() {
      try {
        const response = await fetch('/api/internal/ws-auth');
        if (!response.ok) {
          throw new Error(`Failed to fetch auth token: ${response.status}`);
        }

        const data: { token: string | null; authenticated: boolean; error?: string } = await response.json();

        if (mounted) {
          setToken(data.token);
          setIsAuthenticated(data.authenticated);
          setError(data.error || null);
          setIsLoading(false);
        }
      } catch (err) {
        if (mounted) {
          console.error('[WsAuthProvider] Error fetching token:', err);
          setError(err instanceof Error ? err.message : 'Unknown error');
          setIsLoading(false);
        }
      }
    }

    fetchToken();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <WsAuthContext.Provider value={{ token, isAuthenticated, isLoading, error }}>
      {children}
    </WsAuthContext.Provider>
  );
}
