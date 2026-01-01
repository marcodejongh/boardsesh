'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

const PARTY_MODE_STORAGE_KEY = 'boardsesh:partyMode';

// Backend URL from environment variable (for production deployment)
const BACKEND_URL = process.env.NEXT_PUBLIC_WS_URL || null;

export type PartyMode = 'direct' | 'backend';

interface ConnectionSettingsContextType {
  // Backend URL (from env var only)
  backendUrl: string | null;

  // Party Mode
  partyMode: PartyMode;
  setPartyMode: (mode: PartyMode) => void;

  // Loading state
  isLoaded: boolean;
}

const ConnectionSettingsContext = createContext<ConnectionSettingsContextType | undefined>(undefined);

export const ConnectionSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [storedPartyMode, setStoredPartyMode] = useState<PartyMode>('direct');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load party mode from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedMode = localStorage.getItem(PARTY_MODE_STORAGE_KEY) as PartyMode | null;

      if (storedMode === 'direct' || storedMode === 'backend') {
        setStoredPartyMode(storedMode);
      }

      // Clean up old localStorage keys if they exist
      localStorage.removeItem('boardsesh:backendUrl');

      setIsLoaded(true);
    }
  }, []);

  // Effective party mode - env var forces backend mode
  const partyMode = useMemo<PartyMode>(() => {
    if (BACKEND_URL) {
      return 'backend';
    }
    return storedPartyMode;
  }, [storedPartyMode]);

  const setPartyMode = useCallback((mode: PartyMode) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(PARTY_MODE_STORAGE_KEY, mode);
      setStoredPartyMode(mode);
    }
  }, []);

  const value = useMemo<ConnectionSettingsContextType>(
    () => ({
      backendUrl: BACKEND_URL,
      partyMode,
      setPartyMode,
      isLoaded,
    }),
    [partyMode, setPartyMode, isLoaded],
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
  const { backendUrl, isLoaded } = useConnectionSettings();
  return { backendUrl, isLoaded };
}

export function usePartyMode() {
  const { partyMode, setPartyMode, isLoaded } = useConnectionSettings();
  return { partyMode, setPartyMode, isLoaded };
}
