'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';

const STORAGE_KEY = 'boardsesh:partyMode';

export type PartyMode = 'direct' | 'daemon';

export function usePartyMode() {
  const searchParams = useSearchParams();
  const hasDaemonUrl = !!searchParams.get('daemonUrl');

  const [partyMode, setPartyModeState] = useState<PartyMode>('direct');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // If URL has daemonUrl, force daemon mode
      if (hasDaemonUrl) {
        setPartyModeState('daemon');
        localStorage.setItem(STORAGE_KEY, 'daemon');
      } else {
        const stored = localStorage.getItem(STORAGE_KEY) as PartyMode | null;
        if (stored === 'direct' || stored === 'daemon') {
          setPartyModeState(stored);
        }
      }
      setIsLoaded(true);
    }
  }, [hasDaemonUrl]);

  const setPartyMode = useCallback((mode: PartyMode) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, mode);
      setPartyModeState(mode);
    }
  }, []);

  return {
    partyMode,
    setPartyMode,
    isLoaded,
  };
}
