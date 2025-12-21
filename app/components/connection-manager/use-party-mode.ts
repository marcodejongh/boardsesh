'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

const STORAGE_KEY = 'boardsesh:partyMode';

export type PartyMode = 'direct' | 'daemon';

export function usePartyMode() {
  const searchParams = useSearchParams();
  const hasDaemonUrl = !!searchParams.get('daemonUrl');

  const [storedMode, setStoredMode] = useState<PartyMode>('direct');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY) as PartyMode | null;
      if (stored === 'direct' || stored === 'daemon') {
        setStoredMode(stored);
      }
      setIsLoaded(true);
    }
  }, []);

  // Sync localStorage when URL param forces daemon mode
  useEffect(() => {
    if (hasDaemonUrl && typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, 'daemon');
      setStoredMode('daemon');
    }
  }, [hasDaemonUrl]);

  // Derive effective party mode - URL param takes precedence
  const partyMode = useMemo<PartyMode>(() => {
    if (hasDaemonUrl) {
      return 'daemon';
    }
    return storedMode;
  }, [hasDaemonUrl, storedMode]);

  const setPartyMode = useCallback((mode: PartyMode) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, mode);
      setStoredMode(mode);
    }
  }, []);

  return {
    partyMode,
    setPartyMode,
    isLoaded,
  };
}
