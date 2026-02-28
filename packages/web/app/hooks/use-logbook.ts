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

  const isEnabled = sessionStatus === 'authenticated' && !!token;

  // Determine which UUIDs haven't been fetched yet
  const newUuids = useMemo(
    () => (isEnabled ? climbUuids.filter((uuid) => !fetchedUuidsRef.current.has(uuid)) : []),
    [climbUuids, isEnabled],
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
  const lastMergedRef = useRef<LogbookEntry[] | undefined>(undefined);
  useEffect(() => {
    if (!fetchQuery.data || fetchQuery.data === lastMergedRef.current) return;
    lastMergedRef.current = fetchQuery.data;

    // Mark these UUIDs as fetched (including those with no ticks)
    newUuids.forEach((uuid) => fetchedUuidsRef.current.add(uuid));

    const newEntries = fetchQuery.data;

    setLogbook((existing) => {
      const existingUuids = new Set(existing.map((e: LogbookEntry) => e.uuid));
      const uniqueNew = newEntries.filter((e: LogbookEntry) => !existingUuids.has(e.uuid));
      if (uniqueNew.length === 0) return existing;
      const merged = [...existing, ...uniqueNew];
      // Also update the query cache so useSaveTick's partial key match works
      queryClient.setQueryData(accumulatedLogbookQueryKey(boardName), merged);
      return merged;
    });
  }, [fetchQuery.data, newUuids, boardName, queryClient]);

  // Subscribe to cache changes from useSaveTick's optimistic updates.
  // useSaveTick uses setQueriesData({ queryKey: ['logbook', boardName] })
  // which modifies the accumulated cache entry externally.
  useEffect(() => {
    const key = accumulatedLogbookQueryKey(boardName);
    let lastSeen = queryClient.getQueryData<LogbookEntry[]>(key);

    const unsubscribe = queryClient.getQueryCache().subscribe(() => {
      const cached = queryClient.getQueryData<LogbookEntry[]>(key);
      if (cached !== lastSeen) {
        lastSeen = cached;
        if (cached !== undefined) {
          setLogbook(cached);
        }
      }
    });
    return unsubscribe;
  }, [queryClient, boardName]);

  // Reset when auth is lost (e.g., user logs out) so that a different
  // user logging in doesn't see stale data.
  useEffect(() => {
    if (!isEnabled) {
      fetchedUuidsRef.current = new Set();
      setLogbook([]);
      queryClient.setQueryData(accumulatedLogbookQueryKey(boardName), undefined);
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
 * Clears accumulated data and resets fetch tracking so all UUIDs
 * are re-fetched on the next render.
 */
export function useInvalidateLogbook(boardName: BoardName) {
  const queryClient = useQueryClient();
  return useCallback(() => {
    queryClient.removeQueries({ queryKey: ['logbook', boardName] });
  }, [queryClient, boardName]);
}
