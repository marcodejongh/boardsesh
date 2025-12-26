'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import AnimatedBoardLoading from '../loading/animated-board-loading';
import { BoardDetails } from '@/app/lib/types';

type NavigationLoadingContextType = {
  showLoading: (boardDetails?: BoardDetails | null) => void;
  hideLoading: () => void;
  signalPageReady: () => void;
  isLoading: boolean;
};

const NavigationLoadingContext = createContext<NavigationLoadingContextType | null>(null);

export function useNavigationLoading() {
  const context = useContext(NavigationLoadingContext);
  if (!context) {
    throw new Error('useNavigationLoading must be used within NavigationLoadingProvider');
  }
  return context;
}

const LOADING_TIMEOUT_MS = 10000; // 10 second safety timeout
const PATHNAME_FALLBACK_MS = 2000; // 2 second fallback after pathname change

export function NavigationLoadingProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [boardDetails, setBoardDetails] = useState<BoardDetails | null>(null);
  const pathname = usePathname();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pathnameTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadingRef = useRef(false); // Track loading state for timeouts

  const clearAllTimeouts = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (pathnameTimeoutRef.current) {
      clearTimeout(pathnameTimeoutRef.current);
      pathnameTimeoutRef.current = null;
    }
  }, []);

  const hideLoading = useCallback(() => {
    clearAllTimeouts();
    isLoadingRef.current = false;
    setIsLoading(false);
    setBoardDetails(null);
  }, [clearAllTimeouts]);

  const showLoading = useCallback((details?: BoardDetails | null) => {
    clearAllTimeouts();
    setBoardDetails(details || null);
    isLoadingRef.current = true;
    setIsLoading(true);

    // Set a safety timeout to prevent infinite loading
    timeoutRef.current = setTimeout(() => {
      if (isLoadingRef.current) {
        console.warn('Navigation loading timed out after 10 seconds');
        hideLoading();
      }
    }, LOADING_TIMEOUT_MS);
  }, [clearAllTimeouts, hideLoading]);

  const signalPageReady = useCallback(() => {
    if (isLoadingRef.current) {
      hideLoading();
    }
  }, [hideLoading]);

  // Fallback: hide loading after pathname changes (with delay to allow page to render)
  useEffect(() => {
    if (isLoadingRef.current) {
      // Clear any existing pathname timeout
      if (pathnameTimeoutRef.current) {
        clearTimeout(pathnameTimeoutRef.current);
      }
      // Set a fallback timeout after pathname change
      pathnameTimeoutRef.current = setTimeout(() => {
        if (isLoadingRef.current) {
          hideLoading();
        }
      }, PATHNAME_FALLBACK_MS);
    }
  }, [pathname, hideLoading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllTimeouts();
    };
  }, [clearAllTimeouts]);

  return (
    <NavigationLoadingContext.Provider value={{ showLoading, hideLoading, signalPageReady, isLoading }}>
      <AnimatedBoardLoading isVisible={isLoading} boardDetails={boardDetails} />
      {children}
    </NavigationLoadingContext.Provider>
  );
}
