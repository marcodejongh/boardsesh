import { useState, useEffect, Dispatch } from 'react';
import type { QueueAction } from '../../queue-control/types';

interface UseQueueRestorationParams {
  isPersistentSessionActive: boolean;
  sessionId: string | null;
  baseBoardPath: string;
  dispatch: Dispatch<QueueAction>;
  persistentSession: {
    hasConnected: boolean;
    queue: { climb: unknown; uuid: string }[];
    currentClimbQueueItem: { climb: unknown; uuid: string } | null;
    isLocalQueueLoaded: boolean;
    localBoardPath: string | null;
    localQueue: { climb: unknown; uuid: string }[];
    localCurrentClimbQueueItem: { climb: unknown; uuid: string } | null;
    loadStoredQueue: (boardPath: string) => Promise<{
      queue: { climb: unknown; uuid: string }[];
      currentClimbQueueItem: { climb: unknown; uuid: string } | null;
    } | null>;
    clearLocalQueue: () => void;
    localBoardDetails: unknown;
  };
}

/**
 * Handles initial queue restoration from persistent session (party mode)
 * or from local IndexedDB storage (solo mode).
 *
 * Returns `hasRestored` which gates storage sync to prevent overwriting
 * valid data with empty initial reducer state.
 */
export function useQueueRestoration({
  isPersistentSessionActive,
  sessionId,
  baseBoardPath,
  dispatch,
  persistentSession,
}: UseQueueRestorationParams) {
  // Guard to prevent syncing empty initial state before restoration completes.
  // Uses useState (not useRef) so the sync effect only sees hasRestored=true
  // in the render where state.queue already contains the restored data.
  const [hasRestored, setHasRestored] = useState(false);

  // Initialize queue state from persistent session when remounting
  useEffect(() => {
    if (isPersistentSessionActive && persistentSession.hasConnected) {
      if (persistentSession.queue.length > 0 || persistentSession.currentClimbQueueItem) {
        dispatch({
          type: 'INITIAL_QUEUE_DATA',
          payload: {
            queue: persistentSession.queue as Parameters<typeof dispatch>[0] extends { payload: infer P } ? P extends { queue: infer Q } ? Q : never : never,
            currentClimbQueueItem: persistentSession.currentClimbQueueItem as Parameters<typeof dispatch>[0] extends { payload: infer P } ? P extends { currentClimbQueueItem?: infer C } ? C : never : never,
          },
        });
      }
      setHasRestored(true);
    }
  // Only run on mount and when session becomes active
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPersistentSessionActive, persistentSession.hasConnected]);

  // Initialize queue state from local queue when remounting (non-party mode)
  useEffect(() => {
    if (isPersistentSessionActive || sessionId) return;

    if (
      persistentSession.isLocalQueueLoaded &&
      persistentSession.localBoardPath === baseBoardPath &&
      (persistentSession.localQueue.length > 0 || persistentSession.localCurrentClimbQueueItem)
    ) {
      dispatch({
        type: 'INITIAL_QUEUE_DATA',
        payload: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          queue: persistentSession.localQueue as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          currentClimbQueueItem: persistentSession.localCurrentClimbQueueItem as any,
        },
      });
      setHasRestored(true);
      return;
    }

    if (!persistentSession.isLocalQueueLoaded) {
      persistentSession.loadStoredQueue(baseBoardPath).then((stored) => {
        if (stored && (stored.queue.length > 0 || stored.currentClimbQueueItem)) {
          dispatch({
            type: 'INITIAL_QUEUE_DATA',
            payload: {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              queue: stored.queue as any,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              currentClimbQueueItem: stored.currentClimbQueueItem as any,
            },
          });
        }
        setHasRestored(true);
      });
      return;
    }

    // Local queue is loaded but empty or for a different board
    setHasRestored(true);
  // Only run on mount and when isLocalQueueLoaded changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistentSession.isLocalQueueLoaded]);

  // Clear local queue if navigating to a different board configuration
  useEffect(() => {
    if (persistentSession.localBoardPath && persistentSession.localBoardPath !== baseBoardPath) {
      persistentSession.clearLocalQueue();
    }
  }, [baseBoardPath, persistentSession]);

  return { hasRestored };
}
