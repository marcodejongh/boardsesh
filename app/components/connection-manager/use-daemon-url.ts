'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';

const STORAGE_KEY = 'boardsesh:daemonUrl';

export function useDaemonUrl() {
  const searchParams = useSearchParams();
  const urlDaemonUrl = searchParams.get('daemonUrl');

  const [storedUrl, setStoredUrl] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      setStoredUrl(stored);
      setIsLoaded(true);
    }
  }, []);

  // URL param takes precedence and updates storage
  useEffect(() => {
    if (urlDaemonUrl && typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, urlDaemonUrl);
      setStoredUrl(urlDaemonUrl);
    }
  }, [urlDaemonUrl]);

  const effectiveDaemonUrl = urlDaemonUrl || storedUrl;

  const setDaemonUrl = useCallback((url: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, url);
      setStoredUrl(url);
    }
  }, []);

  const clearDaemonUrl = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
      setStoredUrl(null);
    }
  }, []);

  return {
    daemonUrl: effectiveDaemonUrl,
    setDaemonUrl,
    clearDaemonUrl,
    isLoaded,
    hasUrlParam: !!urlDaemonUrl,
  };
}
