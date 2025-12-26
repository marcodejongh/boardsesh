'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import AnimatedBoardLoading from '../loading/animated-board-loading';
import { BoardDetails } from '@/app/lib/types';

type NavigationLoadingContextType = {
  showLoading: (boardDetails?: BoardDetails | null) => void;
  hideLoading: () => void;
};

const NavigationLoadingContext = createContext<NavigationLoadingContextType | null>(null);

export function useNavigationLoading() {
  const context = useContext(NavigationLoadingContext);
  if (!context) {
    throw new Error('useNavigationLoading must be used within NavigationLoadingProvider');
  }
  return context;
}

export function NavigationLoadingProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [boardDetails, setBoardDetails] = useState<BoardDetails | null>(null);
  const pathname = usePathname();

  const showLoading = useCallback((details?: BoardDetails | null) => {
    setBoardDetails(details || null);
    setIsLoading(true);
  }, []);

  const hideLoading = useCallback(() => {
    setIsLoading(false);
    setBoardDetails(null);
  }, []);

  // Hide loading when route changes (navigation complete)
  useEffect(() => {
    hideLoading();
  }, [pathname, hideLoading]);

  return (
    <NavigationLoadingContext.Provider value={{ showLoading, hideLoading }}>
      <AnimatedBoardLoading isVisible={isLoading} boardDetails={boardDetails} />
      {children}
    </NavigationLoadingContext.Provider>
  );
}
