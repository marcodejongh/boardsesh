'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

const BACKEND_URL_STORAGE_KEY = 'boardsesh:backendUrl';
const PARTY_MODE_STORAGE_KEY = 'boardsesh:partyMode';

// Default backend URL from environment variable (for production Railway deployment)
const DEFAULT_BACKEND_URL = process.env.NEXT_PUBLIC_WS_URL || null;

export type PartyMode = 'direct' | 'backend';

interface ConnectionSettingsContextType {
  // Backend URL
  backendUrl: string | null;
  setBackendUrl: (url: string) => void;
  clearBackendUrl: () => void;
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

  const [storedBackendUrl, setStoredBackendUrl] = useState<string | null>(null);
  const [storedPartyMode, setStoredPartyMode] = useState<PartyMode>('direct');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUrl = localStorage.getItem(BACKEND_URL_STORAGE_KEY);
      const storedMode = localStorage.getItem(PARTY_MODE_STORAGE_KEY) as PartyMode | null;

      if (storedUrl) {
        setStoredBackendUrl(storedUrl);
      }
      if (storedMode === 'direct' || storedMode === 'backend') {
        setStoredPartyMode(storedMode);
      }
      setIsLoaded(true);
    }
  }, []);

  // Sync localStorage when URL param is present
  useEffect(() => {
    if (urlBackendUrl && typeof window !== 'undefined') {
      localStorage.setItem(BACKEND_URL_STORAGE_KEY, urlBackendUrl);
      localStorage.setItem(PARTY_MODE_STORAGE_KEY, 'backend');
      setStoredBackendUrl(urlBackendUrl);
      setStoredPartyMode('backend');
    }
  }, [urlBackendUrl]);

  // Effective backend URL - URL param takes precedence, then localStorage, then env var default
  const backendUrl = useMemo(
    () => urlBackendUrl || storedBackendUrl || DEFAULT_BACKEND_URL,
    [urlBackendUrl, storedBackendUrl],
  );

  // Effective party mode - URL param or env var forces backend mode
  const partyMode = useMemo<PartyMode>(() => {
    if (hasUrlParam || DEFAULT_BACKEND_URL) {
      return 'backend';
    }
    return storedPartyMode;
  }, [hasUrlParam, storedPartyMode]);

  const setBackendUrl = useCallback((url: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(BACKEND_URL_STORAGE_KEY, url);
      setStoredBackendUrl(url);
      // Also set party mode to backend when setting a backend URL
      localStorage.setItem(PARTY_MODE_STORAGE_KEY, 'backend');
      setStoredPartyMode('backend');
    }
  }, []);

  const clearBackendUrl = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(BACKEND_URL_STORAGE_KEY);
      setStoredBackendUrl(null);
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
      backendUrl,
      setBackendUrl,
      clearBackendUrl,
      hasUrlParam,
      partyMode,
      setPartyMode,
      isLoaded,
    }),
    [backendUrl, setBackendUrl, clearBackendUrl, hasUrlParam, partyMode, setPartyMode, isLoaded],
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
export function useBackendUrl() {
  const { backendUrl, setBackendUrl, clearBackendUrl, isLoaded, hasUrlParam } = useConnectionSettings();
  return { backendUrl, setBackendUrl, clearBackendUrl, isLoaded, hasUrlParam };
}

export function usePartyMode() {
  const { partyMode, setPartyMode, isLoaded } = useConnectionSettings();
  return { partyMode, setPartyMode, isLoaded };
}
