import { useEffect, useRef, Dispatch } from 'react';
import type { QueueAction } from '../../queue-control/types';

interface UsePendingUpdateCleanupParams {
  isPersistentSessionActive: boolean;
  pendingCurrentClimbUpdates: string[];
  dispatch: Dispatch<QueueAction>;
}

/**
 * Garbage-collects orphaned pending current-climb updates that were never
 * acknowledged by the server (e.g. due to network failures or timeouts).
 *
 * Uses a ref-persisted timestamp map to track when each correlation ID
 * was first seen, and cleans up entries older than 5 seconds.
 */
export function usePendingUpdateCleanup({
  isPersistentSessionActive,
  pendingCurrentClimbUpdates,
  dispatch,
}: UsePendingUpdateCleanupParams) {
  const pendingTimestampsRef = useRef(new Map<string, number>());

  useEffect(() => {
    if (!isPersistentSessionActive || pendingCurrentClimbUpdates.length === 0) {
      return;
    }

    const pendingTimestamps = pendingTimestampsRef.current;

    // Add timestamps for NEW correlation IDs only
    pendingCurrentClimbUpdates.forEach(id => {
      if (!pendingTimestamps.has(id)) {
        pendingTimestamps.set(id, Date.now());
      }
    });

    // Remove timestamps for correlation IDs no longer pending
    for (const id of pendingTimestamps.keys()) {
      if (!pendingCurrentClimbUpdates.includes(id)) {
        pendingTimestamps.delete(id);
      }
    }

    // Set up cleanup timer for stale entries (>5 seconds)
    const cleanupTimer = setInterval(() => {
      const now = Date.now();
      const staleIds: string[] = [];

      pendingTimestamps.forEach((timestamp: number, id: string) => {
        if (now - timestamp > 5000) {
          staleIds.push(id);
        }
      });

      if (staleIds.length > 0) {
        console.warn('[QueueContext] Cleaning up orphaned pending updates:', staleIds);
        dispatch({
          type: 'CLEANUP_PENDING_UPDATES_BATCH',
          payload: { correlationIds: staleIds },
        });
        staleIds.forEach(id => pendingTimestamps.delete(id));
      }
    }, 2000);

    return () => {
      clearInterval(cleanupTimer);
    };
  }, [isPersistentSessionActive, pendingCurrentClimbUpdates, dispatch]);
}
