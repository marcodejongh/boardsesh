'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

const DAEMON_URL_STORAGE_KEY = 'boardsesh:daemonUrl';
const PARTY_MODE_STORAGE_KEY = 'boardsesh:partyMode';

export type PartyMode = 'direct' | 'daemon';

interface ConnectionSettingsContextType {
  // Daemon URL
  daemonUrl: string | null;
  setDaemonUrl: (url: string) => void;
  clearDaemonUrl: () => void;
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
  const urlDaemonUrl = searchParams.get('daemonUrl');
  const hasUrlParam = !!urlDaemonUrl;

  const [storedDaemonUrl, setStoredDaemonUrl] = useState<string | null>(null);
  const [storedPartyMode, setStoredPartyMode] = useState<PartyMode>('direct');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUrl = localStorage.getItem(DAEMON_URL_STORAGE_KEY);
      const storedMode = localStorage.getItem(PARTY_MODE_STORAGE_KEY) as PartyMode | null;

      if (storedUrl) {
        setStoredDaemonUrl(storedUrl);
      }
      if (storedMode === 'direct' || storedMode === 'daemon') {
        setStoredPartyMode(storedMode);
      }
      setIsLoaded(true);
    }
  }, []);

  // Sync localStorage when URL param is present
  useEffect(() => {
    if (urlDaemonUrl && typeof window !== 'undefined') {
      localStorage.setItem(DAEMON_URL_STORAGE_KEY, urlDaemonUrl);
      localStorage.setItem(PARTY_MODE_STORAGE_KEY, 'daemon');
      setStoredDaemonUrl(urlDaemonUrl);
      setStoredPartyMode('daemon');
    }
  }, [urlDaemonUrl]);

  // Effective daemon URL - URL param takes precedence
  const daemonUrl = useMemo(() => urlDaemonUrl || storedDaemonUrl, [urlDaemonUrl, storedDaemonUrl]);

  // Effective party mode - URL param forces daemon mode
  const partyMode = useMemo<PartyMode>(() => {
    if (hasUrlParam) {
      return 'daemon';
    }
    return storedPartyMode;
  }, [hasUrlParam, storedPartyMode]);

  const setDaemonUrl = useCallback((url: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(DAEMON_URL_STORAGE_KEY, url);
      setStoredDaemonUrl(url);
      // Also set party mode to daemon when setting a daemon URL
      localStorage.setItem(PARTY_MODE_STORAGE_KEY, 'daemon');
      setStoredPartyMode('daemon');
    }
  }, []);

  const clearDaemonUrl = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(DAEMON_URL_STORAGE_KEY);
      setStoredDaemonUrl(null);
    }
  }, []);

  const setPartyMode = useCallback((mode: PartyMode) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(PARTY_MODE_STORAGE_KEY, mode);
      setStoredPartyMode(mode);
    }
  }, []);

  const value = useMemo<ConnectionSettingsContextType>(
    () => ({
      daemonUrl,
      setDaemonUrl,
      clearDaemonUrl,
      hasUrlParam,
      partyMode,
      setPartyMode,
      isLoaded,
    }),
    [daemonUrl, setDaemonUrl, clearDaemonUrl, hasUrlParam, partyMode, setPartyMode, isLoaded],
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

// Convenience hooks for backwards compatibility
export function useDaemonUrl() {
  const { daemonUrl, setDaemonUrl, clearDaemonUrl, isLoaded, hasUrlParam } = useConnectionSettings();
  return { daemonUrl, setDaemonUrl, clearDaemonUrl, isLoaded, hasUrlParam };
}

export function usePartyMode() {
  const { partyMode, setPartyMode, isLoaded } = useConnectionSettings();
  return { partyMode, setPartyMode, isLoaded };
}
