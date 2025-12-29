'use client';

import React, { createContext, useContext, useMemo } from 'react';

interface FavoritesContextValue {
  // Check if a climb is favorited
  isFavorited: (uuid: string) => boolean;
  // Toggle favorite status
  toggleFavorite: (uuid: string) => Promise<boolean>;
  // Loading state
  isLoading: boolean;
  // Is authenticated
  isAuthenticated: boolean;
}

export const FavoritesContext = createContext<FavoritesContextValue | null>(null);

interface FavoritesProviderProps {
  favorites: Set<string>;
  isFavorited: (uuid: string) => boolean;
  toggleFavorite: (uuid: string) => Promise<boolean>;
  isLoading: boolean;
  isAuthenticated: boolean;
  children: React.ReactNode;
}

/**
 * Simple provider that passes hoisted favorites data to child components.
 * The favorites query is made at the page/list level where we know all climb UUIDs,
 * and this context just passes that data down.
 */
export function FavoritesProvider({
  isFavorited,
  toggleFavorite,
  isLoading,
  isAuthenticated,
  children,
}: FavoritesProviderProps) {
  const value = useMemo<FavoritesContextValue>(
    () => ({
      isFavorited,
      toggleFavorite,
      isLoading,
      isAuthenticated,
    }),
    [isFavorited, toggleFavorite, isLoading, isAuthenticated]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

/**
 * Hook to access favorites data from context.
 * Must be used within a FavoritesProvider.
 */
export function useFavoritesContext(): FavoritesContextValue {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavoritesContext must be used within a FavoritesProvider');
  }
  return context;
}

// Re-export for backwards compatibility during migration
export { FavoritesContext as FavoritesBatchContext };
export { FavoritesProvider as FavoritesBatchProvider };
