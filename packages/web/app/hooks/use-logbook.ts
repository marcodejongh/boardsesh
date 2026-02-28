'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { useWsAuthToken } from './use-ws-auth-token';
import { useSession } from 'next-auth/react';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import {
  GET_TICKS,
  type GetTicksQueryVariables,
  type GetTicksQueryResponse,
} from '@/app/lib/graphql/operations';
import type { BoardName, ClimbUuid } from '@/app/lib/types';

// Tick status type matching the database enum
export type TickStatus = 'flash' | 'send' | 'attempt';

// Logbook entry that works for both local ticks and legacy Aurora entries
export interface LogbookEntry {
  uuid: string;
  climb_uuid: string;
  angle: number;
  is_mirror: boolean;
  user_id: number;
  attempt_id: number;
  tries: number;
  quality: number | null;
  difficulty: number | null;
  is_benchmark: boolean;
  is_listed: boolean;
  comment: string;
  climbed_at: string;
  created_at: string;
  updated_at: string;
  wall_uuid: string | null;
  is_ascent: boolean;
  status?: TickStatus;
  aurora_synced?: boolean;
}

function transformTicks(ticks: GetTicksQueryResponse['ticks']): LogbookEntry[] {
  return ticks.map((tick) => ({
    uuid: tick.uuid,
    climb_uuid: tick.climbUuid,
    angle: tick.angle,
    is_mirror: tick.isMirror,
    user_id: 0,
    attempt_id: 0,
    tries: tick.attemptCount,
    quality: tick.quality,
    difficulty: tick.difficulty,
    is_benchmark: tick.isBenchmark,
    is_listed: true,
    comment: tick.comment,
    climbed_at: tick.climbedAt,
    created_at: tick.createdAt,
    updated_at: tick.updatedAt,
    wall_uuid: null,
    is_ascent: tick.status === 'flash' || tick.status === 'send',
    status: tick.status,
    aurora_synced: tick.auroraId !== null,
  }));
}

/**
 * Stable key for accumulated logbook data.
 * useSaveTick's partial key match { queryKey: ['logbook', boardName] } matches this,
 * so optimistic updates propagate automatically to the cache.
 */
export function accumulatedLogbookQueryKey(boardName: BoardName) {
  return ['logbook', boardName, 'accumulated'] as const;
}

/**
 * Dynamic key for each incremental fetch batch.
 * Also matched by useSaveTick's partial key.
 */
function fetchLogbookQueryKey(boardName: BoardName, climbUuids: ClimbUuid[]) {
  return ['logbook', boardName, 'fetch', [...climbUuids].sort().join(',')] as const;
}

/** Backward-compatible export used by tests. */
export function logbookQueryKey(boardName: BoardName, climbUuids: ClimbUuid[]) {
  return ['logbook', boardName, [...climbUuids].sort().join(',')] as const;
}

/**
 * Hook to fetch logbook entries (ticks) for specific climbs.
 *
 * Uses incremental fetching: only fetches data for UUIDs that haven't been
 * fetched yet, and accumulates results in local state plus a React Query
 * cache entry. This prevents indicator flicker when new pages load in the
 * climb list, because existing logbook data is never cleared during a fetch.
 *
 * Compatible with useSaveTick's optimistic updates via partial key matching:
 * useSaveTick uses setQueriesData({ queryKey: ['logbook', boardName] }) which
 * matches the accumulated cache key ['logbook', boardName, 'accumulated'].
 * A cache subscription detects these external updates and syncs them to state.
 */
export function useLogbook(boardName: BoardName, climbUuids: ClimbUuid[]) {
  const { token } = useWsAuthToken();
  const { status: sessionStatus } = useSession();
  const queryClient = useQueryClient();
  const fetchedUuidsRef = useRef<Set<string>>(new Set());
  const [invalidationCount, setInvalidationCount] = useState(0);

  const isEnabled = sessionStatus === 'authenticated' && !!token;

  // Determine which UUIDs haven't been fetched yet.
  // invalidationCount forces recomputation after cache invalidation clears
  // fetchedUuidsRef, since climbUuids/isEnabled may not have changed.
  const newUuids = useMemo(
    () => (isEnabled ? climbUuids.filter((uuid) => !fetchedUuidsRef.current.has(uuid)) : []),
    [climbUuids, isEnabled, invalidationCount],
  );

  // Fetch only the new UUIDs
  const fetchQuery = useQuery({
    queryKey: fetchLogbookQueryKey(boardName, newUuids),
    queryFn: async ({ queryKey }: { queryKey: readonly unknown[] }): Promise<LogbookEntry[]> => {
      // Extract UUIDs from query key to avoid stale closure issues
      const uuidsString = queryKey[3] as string;
      const uuidsToFetch = uuidsString ? uuidsString.split(',') : [];

      if (uuidsToFetch.length === 0) return [];

      const client = createGraphQLHttpClient(token!);
      const variables: GetTicksQueryVariables = {
        input: {
          boardType: boardName,
          climbUuids: uuidsToFetch,
        },
      };
      const response = await client.request<GetTicksQueryResponse>(GET_TICKS, variables);
      return transformTicks(response.ticks);
    },
    enabled: isEnabled && newUuids.length > 0,
    // Each batch is fetched once; accumulation handles deduplication
    staleTime: Infinity,
  });

  // Accumulated logbook state — direct useState for guaranteed re-renders
  const [logbook, setLogbook] = useState<LogbookEntry[]>([]);

  // When fetch completes, merge new entries into state and cache.
  // IMPORTANT: Mark UUIDs as fetched here (not in queryFn) so the query key
  // remains stable until the data is consumed. If we mutated the ref inside
  // queryFn, useMemo would recompute newUuids on the re-render triggered by
  // the resolved query, changing the query key before the data could be read.
  //
  // NOTE: We compute the merge using `logbook` from the closure rather than
  // a functional updater, because React 18 defers updater execution to the
  // render phase — so capturing results from within the updater is unreliable.
  const lastMergedRef = useRef<LogbookEntry[] | undefined>(undefined);
  useEffect(() => {
    if (!fetchQuery.data || fetchQuery.data === lastMergedRef.current) return;
    lastMergedRef.current = fetchQuery.data;

    // Mark these UUIDs as fetched (including those with no ticks)
    newUuids.forEach((uuid) => fetchedUuidsRef.current.add(uuid));

    const newEntries = fetchQuery.data;
    const existingUuids = new Set(logbook.map((e: LogbookEntry) => e.uuid));
    const uniqueNew = newEntries.filter((e: LogbookEntry) => !existingUuids.has(e.uuid));

    if (uniqueNew.length > 0) {
      const merged = [...logbook, ...uniqueNew];
      setLogbook(merged);
      queryClient.setQueryData(accumulatedLogbookQueryKey(boardName), merged);
    }
  }, [fetchQuery.data, newUuids, logbook, boardName, queryClient]);

  // Subscribe to cache changes for the accumulated key only.
  // Handles two scenarios:
  // 1. useSaveTick optimistic updates (setQueriesData modifies the cache externally)
  // 2. Cache invalidation (useInvalidateLogbook removes queries) — resets
  //    fetchedUuidsRef so all UUIDs are re-fetched on the next render.
  useEffect(() => {
    const key = accumulatedLogbookQueryKey(boardName);

    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      // Only react to events for our accumulated key
      const qk = event.query.queryKey;
      if (qk[0] !== key[0] || qk[1] !== key[1] || qk[2] !== key[2]) return;

      if (event.type === 'removed') {
        // Cache was cleared (e.g., useInvalidateLogbook) — reset tracking
        // so all current climbUuids are re-fetched on the next render.
        fetchedUuidsRef.current = new Set();
        lastMergedRef.current = undefined;
        setLogbook([]);
        setInvalidationCount((c) => c + 1);
      } else if (event.type === 'updated') {
        const cached = queryClient.getQueryData<LogbookEntry[]>(key);
        if (cached !== undefined) {
          setLogbook(cached);
        }
      }
    });
    return unsubscribe;
  }, [queryClient, boardName]);

  // Reset when auth is lost (e.g., user logs out) so that a different
  // user logging in doesn't see stale data. Uses removeQueries to also
  // clear fetch cache entries, ensuring re-auth triggers actual re-fetches
  // instead of returning stale cached data.
  useEffect(() => {
    if (!isEnabled) {
      fetchedUuidsRef.current = new Set();
      lastMergedRef.current = undefined;
      setLogbook([]);
      queryClient.removeQueries({ queryKey: ['logbook', boardName] });
    }
  }, [isEnabled, boardName, queryClient]);

  return {
    logbook,
    isLoading: fetchQuery.isLoading && logbook.length === 0,
    error: fetchQuery.error,
  };
}

/**
 * Returns a function to invalidate logbook queries for a given board.
 * Removes all logbook queries from the cache, which triggers the cache
 * subscription in useLogbook to reset fetchedUuidsRef and re-fetch.
 */
export function useInvalidateLogbook(boardName: BoardName) {
  const queryClient = useQueryClient();
  return useCallback(() => {
    queryClient.removeQueries({ queryKey: ['logbook', boardName] });
  }, [queryClient, boardName]);
}
