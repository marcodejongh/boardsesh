'use client';

import { useState, useCallback, useEffect } from 'react';

interface PaginatedFeedResult<T> {
  items: T[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  totalCount: number;
  loadMore: () => void;
}

interface UsePaginatedFeedOptions<T> {
  /** Fetch function that returns paginated data */
  fetchFn: (offset: number) => Promise<{ items: T[]; hasMore: boolean; totalCount: number }>;
  /** Whether to auto-fetch on mount. Defaults to true. */
  enabled?: boolean;
  /** Page size for pagination. Used only for display logic. */
  pageSize?: number;
}

/**
 * Shared hook for offset-based paginated feeds.
 * Consolidates the duplicated pagination pattern used by:
 * - FollowingAscentsFeed
 * - GlobalAscentsFeed
 */
export function usePaginatedFeed<T>({
  fetchFn,
  enabled = true,
}: UsePaginatedFeedOptions<T>): PaginatedFeedResult<T> {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const fetchPage = useCallback(async (offset: number) => {
    if (offset === 0) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const result = await fetchFn(offset);

      if (offset === 0) {
        setItems(result.items);
      } else {
        setItems((prev) => [...prev, ...result.items]);
      }
      setHasMore(result.hasMore);
      setTotalCount(result.totalCount);
    } catch (error) {
      console.error('Error fetching feed:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    if (enabled) {
      fetchPage(0);
    } else {
      setLoading(false);
    }
  }, [enabled, fetchPage]);

  const loadMore = useCallback(() => {
    fetchPage(items.length);
  }, [fetchPage, items.length]);

  return {
    items,
    loading,
    loadingMore,
    hasMore,
    totalCount,
    loadMore,
  };
}
