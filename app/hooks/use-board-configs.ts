import { useState, useEffect } from 'react';
import { BoardName } from '@/app/lib/types';
import { LayoutRow, SizeRow, SetRow } from '@/app/lib/data/queries';

type BoardConfigCache = {
  layouts: Record<BoardName, LayoutRow[]>;
  sizes: Record<string, SizeRow[]>;
  sets: Record<string, SetRow[]>;
  details: Record<string, unknown>;
};

let globalCache: BoardConfigCache | null = null;
let fetchPromise: Promise<BoardConfigCache> | null = null;

async function fetchBoardConfigs(): Promise<BoardConfigCache> {
  if (globalCache) {
    return globalCache;
  }

  if (fetchPromise) {
    return fetchPromise;
  }

  fetchPromise = fetch('/api/internal/board-configs')
    .then((res) => res.json())
    .then((data) => {
      globalCache = data;
      fetchPromise = null;
      return data;
    })
    .catch((error) => {
      console.error('Failed to fetch board configs:', error);
      fetchPromise = null;
      throw error;
    });

  return fetchPromise;
}

export function useBoardConfigs() {
  const [data, setData] = useState<BoardConfigCache | null>(globalCache);
  const [isLoading, setIsLoading] = useState(!globalCache);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (globalCache) {
      setData(globalCache);
      setIsLoading(false);
      return;
    }

    fetchBoardConfigs()
      .then(setData)
      .catch(setError)
      .finally(() => setIsLoading(false));
  }, []);

  const getLayouts = (board: BoardName): LayoutRow[] => {
    return data?.layouts[board] || [];
  };

  const getSizes = (board: BoardName, layoutId: number): SizeRow[] => {
    const key = `${board}-${layoutId}`;
    return data?.sizes[key] || [];
  };

  const getSets = (board: BoardName, layoutId: number, sizeId: number): SetRow[] => {
    const key = `${board}-${layoutId}-${sizeId}`;
    return data?.sets[key] || [];
  };

  const getBoardDetails = (board: BoardName, layoutId: number, sizeId: number, setIds: number[]) => {
    const key = `${board}-${layoutId}-${sizeId}-${setIds.join(',')}`;
    return data?.details[key] || null;
  };

  return {
    data,
    isLoading,
    error,
    getLayouts,
    getSizes,
    getSets,
    getBoardDetails,
  };
}
