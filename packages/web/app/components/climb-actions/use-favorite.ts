'use client';

import { useCallback } from 'react';
import { useFavoritesContext } from './favorites-batch-context';

type UseFavoriteOptions = {
  climbUuid: string;
};

type UseFavoriteReturn = {
  isFavorited: boolean;
  isLoading: boolean;
  toggleFavorite: () => Promise<boolean>;
  isAuthenticated: boolean;
};

/**
 * Hook to check and toggle favorite status for a climb.
 *
 * Uses the hoisted favorites query from FavoritesProvider (set up at the queue level).
 * This ensures all favorite checks on a page share a single GraphQL request.
 */
export function useFavorite({ climbUuid }: UseFavoriteOptions): UseFavoriteReturn {
  const { isFavorited, toggleFavorite, isLoading, isAuthenticated } = useFavoritesContext();

  const handleToggle = useCallback(async (): Promise<boolean> => {
    return toggleFavorite(climbUuid);
  }, [toggleFavorite, climbUuid]);

  return {
    isFavorited: isFavorited(climbUuid),
    isLoading,
    toggleFavorite: handleToggle,
    isAuthenticated,
  };
}
