'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

const PARTY_MODE_STORAGE_KEY = 'boardsesh:partyMode';

// Default backend URL from environment variable (for production deployment)
const DEFAULT_BACKEND_URL = process.env.NEXT_PUBLIC_WS_URL || null;

export type PartyMode = 'direct' | 'backend';

interface ConnectionSettingsContextType {
  // Backend URL (from URL param or env var - no longer stored in localStorage)
  backendUrl: string | null;
  hasUrlParam: boolean;

  // Party Mode
  partyMode: PartyMode;
  setPartyMode: (mode: PartyMode) => void;

  // Loading state
  isLoaded: boolean;
}

const ConnectionSettingsContext = createContext<ConnectionSettingsContextType | undefined>(undefined);

export const ConnectionSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const searchParams = useSearchParams();
  const urlBackendUrl = searchParams.get('backendUrl');
  const hasUrlParam = !!urlBackendUrl;

  const [storedPartyMode, setStoredPartyMode] = useState<PartyMode>('direct');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load party mode from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedMode = localStorage.getItem(PARTY_MODE_STORAGE_KEY) as PartyMode | null;

      if (storedMode === 'direct' || storedMode === 'backend') {
        setStoredPartyMode(storedMode);
      }

      // Clean up old localStorage key if it exists
      localStorage.removeItem('boardsesh:backendUrl');

      setIsLoaded(true);
    }
  }, []);

  // Set party mode to backend when URL param is present
  useEffect(() => {
    if (urlBackendUrl && typeof window !== 'undefined') {
      localStorage.setItem(PARTY_MODE_STORAGE_KEY, 'backend');
      setStoredPartyMode('backend');
    }
  }, [urlBackendUrl]);

  // Backend URL - URL param takes precedence, then env var default
  const backendUrl = useMemo(() => urlBackendUrl || DEFAULT_BACKEND_URL, [urlBackendUrl]);

  // Effective party mode - URL param or env var forces backend mode
  const partyMode = useMemo<PartyMode>(() => {
    if (hasUrlParam || DEFAULT_BACKEND_URL) {
      return 'backend';
    }
    return storedPartyMode;
  }, [hasUrlParam, storedPartyMode]);

  const setPartyMode = useCallback((mode: PartyMode) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(PARTY_MODE_STORAGE_KEY, mode);
      setStoredPartyMode(mode);
    }
  }, []);

  const value = useMemo<ConnectionSettingsContextType>(
    () => ({
      backendUrl,
      hasUrlParam,
      partyMode,
      setPartyMode,
      isLoaded,
    }),
    [backendUrl, hasUrlParam, partyMode, setPartyMode, isLoaded],
  );

  return <ConnectionSettingsContext.Provider value={value}>{children}</ConnectionSettingsContext.Provider>;
};

export function useConnectionSettings() {
  const context = useContext(ConnectionSettingsContext);
  if (!context) {
    throw new Error('useConnectionSettings must be used within a ConnectionSettingsProvider');
  }
  return context;
}

// Convenience hook for backwards compatibility
export function useBackendUrl() {
  const { backendUrl, isLoaded, hasUrlParam } = useConnectionSettings();
  return { backendUrl, isLoaded, hasUrlParam };
}

export function usePartyMode() {
  const { partyMode, setPartyMode, isLoaded } = useConnectionSettings();
  return { partyMode, setPartyMode, isLoaded };
}
