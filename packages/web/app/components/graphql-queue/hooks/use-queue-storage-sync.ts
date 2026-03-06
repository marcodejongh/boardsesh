import { useEffect } from 'react';
import type { ClimbQueueItem } from '../../queue-control/types';
import type { BoardDetails } from '@/app/lib/types';

interface UseQueueStorageSyncParams {
  hasRestored: boolean;
  isPersistentSessionActive: boolean;
  sessionId: string | null;
  queue: ClimbQueueItem[];
  currentClimbQueueItem: ClimbQueueItem | null;
  baseBoardPath: string;
  boardDetails: BoardDetails;
  persistentSession: {
    setLocalQueueState: (
      queue: ClimbQueueItem[],
      currentItem: ClimbQueueItem | null,
      boardPath: string,
      boardDetails: BoardDetails,
    ) => void;
  };
}

/**
 * Persists queue changes to IndexedDB (via persistent session local queue)
 * when not in party mode. Gated by `hasRestored` to prevent overwriting
 * valid data with empty initial reducer state.
 */
export function useQueueStorageSync({
  hasRestored,
  isPersistentSessionActive,
  sessionId,
  queue,
  currentClimbQueueItem,
  baseBoardPath,
  boardDetails,
  persistentSession,
}: UseQueueStorageSyncParams) {
  useEffect(() => {
    // Don't sync until initial restoration is complete
    if (!hasRestored) return;

    // Only sync when NOT in party mode
    if (isPersistentSessionActive || sessionId) return;

    // Sync queue state to persistent session for local storage
    persistentSession.setLocalQueueState(
      queue,
      currentClimbQueueItem,
      baseBoardPath,
      boardDetails,
    );
  }, [
    hasRestored,
    queue,
    currentClimbQueueItem,
    baseBoardPath,
    boardDetails,
    isPersistentSessionActive,
    sessionId,
    persistentSession,
  ]);
}
