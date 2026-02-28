import { createIndexedDBStore } from './idb-helper';
import { ClimbQueueItem } from '../components/queue-control/types';
import { BoardDetails } from './types';

const STORE_NAME = 'queues';

/**
 * Stored queue state for a specific board configuration
 */
export interface StoredQueueState {
  boardPath: string;
  queue: ClimbQueueItem[];
  currentClimbQueueItem: ClimbQueueItem | null;
  boardDetails: BoardDetails;
  updatedAt: number;
}

const getDB = createIndexedDBStore('boardsesh-queue', STORE_NAME);

/**
 * Get the queue key for a board path
 * Uses the full board path as key for simplicity
 */
function getQueueKey(boardPath: string): string {
  return `queue:${boardPath}`;
}

/**
 * Get stored queue state for a specific board path
 */
export const getStoredQueue = async (boardPath: string): Promise<StoredQueueState | null> => {
  try {
    const db = await getDB();
    if (!db) return null;
    const key = getQueueKey(boardPath);
    const stored = await db.get(STORE_NAME, key);

    if (stored) {
      // Filter out any corrupted items
      const filteredQueue = (stored.queue || []).filter(
        (item: ClimbQueueItem | null | undefined): item is ClimbQueueItem =>
          item != null && item.climb != null
      );

      return {
        ...stored,
        queue: filteredQueue,
      };
    }

    return null;
  } catch (error) {
    console.error('[QueueStorage] Failed to get stored queue:', error);
    return null;
  }
};

/**
 * Save queue state for a specific board path
 */
export const saveQueueState = async (state: StoredQueueState): Promise<void> => {
  try {
    const db = await getDB();
    if (!db) return;
    const key = getQueueKey(state.boardPath);

    // Ensure we save with timestamp
    const stateWithTimestamp: StoredQueueState = {
      ...state,
      updatedAt: Date.now(),
    };

    await db.put(STORE_NAME, stateWithTimestamp, key);
  } catch (error) {
    console.error('[QueueStorage] Failed to save queue state:', error);
    throw error;
  }
};

/**
 * Clear stored queue for a specific board path
 */
export const clearStoredQueue = async (boardPath: string): Promise<void> => {
  try {
    const db = await getDB();
    if (!db) return;
    const key = getQueueKey(boardPath);
    await db.delete(STORE_NAME, key);
  } catch (error) {
    console.error('[QueueStorage] Failed to clear stored queue:', error);
    throw error;
  }
};

/**
 * Get the most recently updated stored queue across all board paths.
 * Used to auto-restore the queue on app startup (non-board routes).
 */
export const getMostRecentQueue = async (): Promise<StoredQueueState | null> => {
  try {
    const db = await getDB();
    if (!db) return null;
    const allKeys = await db.getAllKeys(STORE_NAME);
    let mostRecent: StoredQueueState | null = null;

    for (const key of allKeys) {
      const stored = await db.get(STORE_NAME, key);
      if (stored && (!mostRecent || stored.updatedAt > mostRecent.updatedAt)) {
        mostRecent = stored;
      }
    }

    if (mostRecent) {
      // Filter corrupted items (same as getStoredQueue)
      const filteredQueue = (mostRecent.queue || []).filter(
        (item: ClimbQueueItem | null | undefined): item is ClimbQueueItem =>
          item != null && item.climb != null,
      );
      return { ...mostRecent, queue: filteredQueue };
    }

    return null;
  } catch (error) {
    console.error('[QueueStorage] Failed to get most recent queue:', error);
    return null;
  }
};

/**
 * Get all stored queue states (for debugging or cleanup)
 */
export const getAllStoredQueues = async (): Promise<StoredQueueState[]> => {
  try {
    const db = await getDB();
    if (!db) return [];
    const allKeys = await db.getAllKeys(STORE_NAME);
    const queues: StoredQueueState[] = [];

    for (const key of allKeys) {
      const stored = await db.get(STORE_NAME, key);
      if (stored) {
        queues.push(stored);
      }
    }

    return queues;
  } catch (error) {
    console.error('[QueueStorage] Failed to get all stored queues:', error);
    return [];
  }
};

/**
 * Clean up old stored queues (older than specified days)
 * Default: 30 days
 */
export const cleanupOldQueues = async (maxAgeDays: number = 30): Promise<number> => {
  try {
    const db = await getDB();
    if (!db) return 0;
    const allKeys = await db.getAllKeys(STORE_NAME);
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
    const now = Date.now();
    let cleanedCount = 0;

    for (const key of allKeys) {
      const stored = await db.get(STORE_NAME, key);
      if (stored && stored.updatedAt) {
        const age = now - stored.updatedAt;
        if (age > maxAgeMs) {
          await db.delete(STORE_NAME, key);
          cleanedCount++;
        }
      }
    }

    if (cleanedCount > 0) {
      console.log(`[QueueStorage] Cleaned up ${cleanedCount} old queue(s)`);
    }

    return cleanedCount;
  } catch (error) {
    console.error('[QueueStorage] Failed to cleanup old queues:', error);
    return 0;
  }
};
