'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { getPreference, setPreference, removePreference } from '@/app/lib/user-preferences-db';

const PARTY_MODE_PREFERENCE_KEY = 'boardsesh:partyMode';

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

  // Load party mode from IndexedDB on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    getPreference<PartyMode>(PARTY_MODE_PREFERENCE_KEY).then((storedMode) => {
      if (storedMode === 'direct' || storedMode === 'backend') {
        setStoredPartyMode(storedMode);
      }

      // Clean up old preference keys if they exist
      removePreference('boardsesh:backendUrl').catch(() => {});

      setIsLoaded(true);
    });
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
      setPreference(PARTY_MODE_PREFERENCE_KEY, mode).catch(() => {});
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
