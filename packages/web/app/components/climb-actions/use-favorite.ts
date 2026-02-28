'use client';

import { useCallback, useContext } from 'react';
import { FavoritesContext } from './favorites-batch-context';

type UseFavoriteOptions = {
  climbUuid: string;
};

type UseFavoriteReturn = {
  isFavorited: boolean;
  isLoading: boolean;
  toggleFavorite: () => Promise<boolean>;
  isAuthenticated: boolean;
};

const noopToggle = async () => false;

/**
 * Hook to check and toggle favorite status for a climb.
 *
 * Uses the hoisted favorites query from FavoritesProvider when available.
 * When rendered outside a FavoritesProvider (e.g. on the home page proposals feed),
 * returns safe defaults — favorite actions will be unavailable but won't crash.
 */
export function useFavorite({ climbUuid }: UseFavoriteOptions): UseFavoriteReturn {
  const context = useContext(FavoritesContext);

  const handleToggle = useCallback(async (): Promise<boolean> => {
    if (!context) return false;
    return context.toggleFavorite(climbUuid);
  }, [context, climbUuid]);

  if (!context) {
    return {
      isFavorited: false,
      isLoading: false,
      toggleFavorite: noopToggle,
      isAuthenticated: false,
    };
  }

  return {
    isFavorited: context.isFavorited(climbUuid),
    isLoading: context.isLoading,
    toggleFavorite: handleToggle,
    isAuthenticated: context.isAuthenticated,
  };
}
