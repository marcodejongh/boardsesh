'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
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

export function NavigationLoadingProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [boardDetails, setBoardDetails] = useState<BoardDetails | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearLoadingTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const hideLoading = useCallback(() => {
    clearLoadingTimeout();
    setIsLoading(false);
    setBoardDetails(null);
  }, [clearLoadingTimeout]);

  const showLoading = useCallback((details?: BoardDetails | null) => {
    clearLoadingTimeout();
    setBoardDetails(details || null);
    setIsLoading(true);

    // Set a safety timeout to prevent infinite loading
    timeoutRef.current = setTimeout(() => {
      console.warn('Navigation loading timed out after 10 seconds');
      hideLoading();
    }, LOADING_TIMEOUT_MS);
  }, [clearLoadingTimeout, hideLoading]);

  const signalPageReady = useCallback(() => {
    hideLoading();
  }, [hideLoading]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      clearLoadingTimeout();
    };
  }, [clearLoadingTimeout]);

  return (
    <NavigationLoadingContext.Provider value={{ showLoading, hideLoading, signalPageReady, isLoading }}>
      <AnimatedBoardLoading isVisible={isLoading} boardDetails={boardDetails} />
      {children}
    </NavigationLoadingContext.Provider>
  );
}
