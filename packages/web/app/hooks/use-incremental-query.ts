'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useEffect, useMemo, useState, useCallback } from 'react';

const DEFAULT_CHUNK_SIZE = 500;

interface UseIncrementalQueryOptions<T> {
  /** Stable cache key for accumulated results (no UUIDs in key) */
  accumulatedKey: readonly unknown[];
  /** Prefix for dynamic fetch keys — UUIDs are appended automatically */
  fetchKeyPrefix: readonly unknown[];
  /** Whether the query is enabled (auth check, etc.) */
  enabled: boolean;
  /** Max items per request chunk (default 500, matches server validation limit) */
  chunkSize?: number;
  /** Fetches data for a chunk of UUIDs, returns the raw result */
  fetchChunk: (uuids: string[]) => Promise<T>;
  /** Merges new fetch result into accumulated state, returns new accumulated state */
  merge: (accumulated: T, fetched: T) => T;
  /** Empty/initial value for T */
  initialValue: T;
  /**
   * Size-based comparison to detect whether merge produced new data.
   * Intentionally compares sizes rather than deep equality for performance —
   * merge always grows the collection, so a size change is a reliable signal.
   */
  hasChanged: (prev: T, next: T) => boolean;
}

interface UseIncrementalQueryResult<T> {
  data: T;
  isLoading: boolean;
  /**
   * Cancel all in-flight fetch queries for this incremental query.
   * Useful for optimistic mutations that need to prevent stale fetch results
   * from overwriting the optimistic state.
   */
  cancelFetches: () => Promise<void>;
}

function chunkArray<U>(arr: U[], size: number): U[][] {
  const chunks: U[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Generic incremental fetch hook.
 *
 * Tracks which UUIDs have already been fetched, only fetches new ones,
 * chunks large requests to respect server limits, and accumulates results
 * in local state + a stable React Query cache entry.
 *
 * Follows the proven pattern from useLogbook (packages/web/app/hooks/use-logbook.ts).
 * Compatible with optimistic updates via cache subscription.
 */
export function useIncrementalQuery<T>(
  uuids: string[],
  options: UseIncrementalQueryOptions<T>,
): UseIncrementalQueryResult<T> {
  const {
    accumulatedKey,
    fetchKeyPrefix,
    enabled,
    chunkSize = DEFAULT_CHUNK_SIZE,
    fetchChunk,
    merge,
    initialValue,
    hasChanged,
  } = options;

  const queryClient = useQueryClient();
  const fetchedUuidsRef = useRef<Set<string>>(new Set());
  const [invalidationCount, setInvalidationCount] = useState(0);

  // Track the previous key identity so we can reset when context changes
  // (e.g., boardName or angle changes but the same UUID list is passed).
  const prevKeyRef = useRef<string>(JSON.stringify(accumulatedKey));
  const currentKeyStr = JSON.stringify(accumulatedKey);
  if (prevKeyRef.current !== currentKeyStr) {
    prevKeyRef.current = currentKeyStr;
    // Key identity changed — reset fetched tracking and accumulated state.
    // This is synchronous (during render) to ensure the first fetch after the
    // change uses a clean fetchedUuidsRef, rather than deferring to an effect
    // which would cause one render cycle with stale data.
    fetchedUuidsRef.current = new Set();
  }

  // Determine which UUIDs haven't been fetched yet.
  // invalidationCount forces recomputation after cache invalidation clears
  // fetchedUuidsRef, since uuids/enabled may not have changed.
  const newUuids = useMemo(
    () => (enabled ? uuids.filter((uuid) => !fetchedUuidsRef.current.has(uuid)) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [uuids, enabled, invalidationCount, currentKeyStr],
  );

  // Dynamic fetch key includes only the new UUIDs
  const fetchKey = useMemo(
    () => [...fetchKeyPrefix, [...newUuids].sort().join(',')] as const,
    [fetchKeyPrefix, newUuids],
  );

  // Fetch only the new UUIDs, chunking if necessary
  const fetchQuery = useQuery({
    queryKey: fetchKey,
    queryFn: async ({ queryKey }: { queryKey: readonly unknown[] }): Promise<T> => {
      // Extract UUIDs from query key to avoid stale closure issues
      const uuidsString = queryKey[queryKey.length - 1] as string;
      const uuidsToFetch = uuidsString ? uuidsString.split(',') : [];

      if (uuidsToFetch.length === 0) return initialValue;

      const chunks = chunkArray(uuidsToFetch, chunkSize);

      if (chunks.length === 1) {
        return fetchChunk(chunks[0]);
      }

      // Parallel fetch for multiple chunks, then merge
      const results = await Promise.all(chunks.map((chunk) => fetchChunk(chunk)));
      return results.reduce((acc, result) => merge(acc, result), initialValue);
    },
    enabled: enabled && newUuids.length > 0,
    // Each batch is fetched once; accumulation handles deduplication
    staleTime: Infinity,
  });

  // Cancel all in-flight fetch queries — exposed for optimistic mutations
  // to prevent stale fetch responses from overwriting optimistic state.
  const cancelFetches = useCallback(async () => {
    await queryClient.cancelQueries({ queryKey: fetchKeyPrefix });
    await queryClient.cancelQueries({ queryKey: accumulatedKey });
  }, [queryClient, fetchKeyPrefix, accumulatedKey]);

  // Accumulated state — direct useState for guaranteed re-renders
  const [accumulated, setAccumulated] = useState<T>(initialValue);

  // Reset accumulated state when key identity changes (deferred cleanup for
  // cache entries; the synchronous reset above handles fetchedUuidsRef).
  useEffect(() => {
    // On mount this runs once; on key change it clears old cache entries.
    return () => {
      // Cleanup old cache when key identity changes or component unmounts
      queryClient.removeQueries({ queryKey: fetchKeyPrefix });
      queryClient.removeQueries({ queryKey: accumulatedKey });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKeyStr]);

  // When key identity changes, reset accumulated state
  const prevAccKeyRef = useRef<string>(currentKeyStr);
  useEffect(() => {
    if (prevAccKeyRef.current !== currentKeyStr) {
      prevAccKeyRef.current = currentKeyStr;
      lastMergedRef.current = undefined;
      lastCacheWriteRef.current = undefined;
      setAccumulated(initialValue);
    }
  }, [currentKeyStr, initialValue]);

  // When fetch completes, merge new entries into state and cache.
  // IMPORTANT: Mark UUIDs as fetched here (not in queryFn) so the query key
  // remains stable until the data is consumed. If we mutated the ref inside
  // queryFn, useMemo would recompute newUuids on the re-render triggered by
  // the resolved query, changing the query key before the data could be read.
  const lastMergedRef = useRef<T | undefined>(undefined);
  // Tracks the value we last wrote to the cache ourselves, so the subscription
  // can skip the self-triggered 'updated' event (avoids redundant setAccumulated calls).
  const lastCacheWriteRef = useRef<T | undefined>(undefined);
  useEffect(() => {
    if (!fetchQuery.data || fetchQuery.data === lastMergedRef.current) return;
    lastMergedRef.current = fetchQuery.data;

    // Mark these UUIDs as fetched (including those with no results)
    newUuids.forEach((uuid) => fetchedUuidsRef.current.add(uuid));

    const merged = merge(accumulated, fetchQuery.data);
    if (hasChanged(accumulated, merged)) {
      setAccumulated(merged);
      lastCacheWriteRef.current = merged;
      queryClient.setQueryData(accumulatedKey, merged);
    }
  }, [fetchQuery.data, newUuids, accumulated, merge, hasChanged, accumulatedKey, queryClient]);

  // Subscribe to cache changes for the accumulated key only.
  // Handles two scenarios:
  // 1. Optimistic updates (setQueriesData modifies the cache externally)
  // 2. Cache invalidation (removeQueries) — resets fetchedUuidsRef so all
  //    UUIDs are re-fetched on the next render.
  useEffect(() => {
    const key = accumulatedKey;

    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      // Only react to events for our accumulated key
      const qk = event.query.queryKey;
      if (qk.length !== key.length || qk.some((v, i) => v !== key[i])) return;

      if (event.type === 'removed') {
        // Cache was cleared — reset tracking so all current UUIDs are re-fetched
        fetchedUuidsRef.current = new Set();
        lastMergedRef.current = undefined;
        lastCacheWriteRef.current = undefined;
        setAccumulated(initialValue);
        setInvalidationCount((c) => c + 1);
      } else if (event.type === 'updated') {
        const cached = queryClient.getQueryData<T>(key);
        if (cached !== undefined) {
          // Skip the self-triggered event from our own merge effect (same reference
          // we just wrote), but clear the ref so subsequent writes are not filtered.
          if (cached === lastCacheWriteRef.current) {
            lastCacheWriteRef.current = undefined;
            return;
          }
          setAccumulated(cached);
        }
      }
    });
    return unsubscribe;
  }, [queryClient, accumulatedKey, initialValue]);

  // Reset when disabled (e.g., user logs out) so a different user logging in
  // doesn't see stale data. Uses removeQueries to also clear fetch cache entries.
  useEffect(() => {
    if (!enabled) {
      fetchedUuidsRef.current = new Set();
      lastMergedRef.current = undefined;
      lastCacheWriteRef.current = undefined;
      setAccumulated(initialValue);
      queryClient.removeQueries({ queryKey: fetchKeyPrefix });
      queryClient.removeQueries({ queryKey: accumulatedKey });
    }
  }, [enabled, fetchKeyPrefix, accumulatedKey, initialValue, queryClient]);

  return {
    data: accumulated,
    isLoading: fetchQuery.isLoading && !hasChanged(initialValue, accumulated),
    cancelFetches,
  };
}
