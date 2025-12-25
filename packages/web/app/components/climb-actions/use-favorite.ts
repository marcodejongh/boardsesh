'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import { BoardName } from '@/app/lib/types';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

type UseFavoriteOptions = {
  boardName: BoardName;
  climbUuid: string;
  angle: number;
};

type UseFavoriteReturn = {
  isFavorited: boolean;
  isLoading: boolean;
  toggleFavorite: () => Promise<boolean>;
  isAuthenticated: boolean;
};

export function useFavorite({
  boardName,
  climbUuid,
  angle,
}: UseFavoriteOptions): UseFavoriteReturn {
  const { status } = useSession();
  const isAuthenticated = status === 'authenticated';
  const [isToggling, setIsToggling] = useState(false);

  // Build the SWR key only if authenticated
  const swrKey = isAuthenticated
    ? `/api/internal/favorites?boardName=${boardName}&climbUuids=${climbUuid}&angle=${angle}`
    : null;

  const { data, mutate, isLoading: isLoadingFavorite } = useSWR<{ favorites: string[] }>(
    swrKey,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  const isFavorited = data?.favorites?.includes(climbUuid) ?? false;

  const toggleFavorite = useCallback(async (): Promise<boolean> => {
    if (!isAuthenticated) {
      return false;
    }

    setIsToggling(true);

    try {
      // Optimistic update
      const newFavorited = !isFavorited;
      mutate(
        {
          favorites: newFavorited
            ? [...(data?.favorites || []), climbUuid]
            : (data?.favorites || []).filter((id) => id !== climbUuid),
        },
        false
      );

      const response = await fetch('/api/internal/favorites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          boardName,
          climbUuid,
          angle,
        }),
      });

      if (!response.ok) {
        // Revert optimistic update on error
        mutate();
        throw new Error('Failed to toggle favorite');
      }

      const result = await response.json();

      // Revalidate to ensure we have the correct state
      mutate();

      return result.favorited;
    } catch (error) {
      console.error('Error toggling favorite:', error);
      throw error;
    } finally {
      setIsToggling(false);
    }
  }, [isAuthenticated, isFavorited, mutate, data, boardName, climbUuid, angle]);

  return {
    isFavorited,
    isLoading: isLoadingFavorite || isToggling || status === 'loading',
    toggleFavorite,
    isAuthenticated,
  };
}

// Hook for batch checking favorites (useful for climb lists)
type UseFavoritesBatchOptions = {
  boardName: BoardName;
  climbUuids: string[];
  angle: number;
};

type UseFavoritesBatchReturn = {
  favorites: Set<string>;
  isLoading: boolean;
  isAuthenticated: boolean;
  refetch: () => void;
};

export function useFavoritesBatch({
  boardName,
  climbUuids,
  angle,
}: UseFavoritesBatchOptions): UseFavoritesBatchReturn {
  const { status } = useSession();
  const isAuthenticated = status === 'authenticated';

  // Build the SWR key only if authenticated and we have climb UUIDs
  const swrKey =
    isAuthenticated && climbUuids.length > 0
      ? `/api/internal/favorites?boardName=${boardName}&climbUuids=${climbUuids.join(',')}&angle=${angle}`
      : null;

  const { data, isLoading, mutate } = useSWR<{ favorites: string[] }>(
    swrKey,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  return {
    favorites: new Set(data?.favorites || []),
    isLoading: isLoading || status === 'loading',
    isAuthenticated,
    refetch: () => mutate(),
  };
}
