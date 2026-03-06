import { useState, useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import type { ClimbQueueItem as LocalClimbQueueItem } from '../../queue-control/types';
import type { BoardDetails } from '@/app/lib/types';
import { getStoredQueue, saveQueueState, cleanupOldQueues, getMostRecentQueue, type StoredQueueState } from '@/app/lib/queue-storage-db';
import { getPreference } from '@/app/lib/user-preferences-db';
import type { ActiveSessionInfo } from '../types';
import { ACTIVE_SESSION_KEY, QUEUE_SAVE_DEBOUNCE_MS, DEBUG } from '../types';

interface UseQueueStorageArgs {
  activeSession: ActiveSessionInfo | null;
  setActiveSession: Dispatch<SetStateAction<ActiveSessionInfo | null>>;
}

export interface QueueStorageState {
  localQueue: LocalClimbQueueItem[];
  localCurrentClimbQueueItem: LocalClimbQueueItem | null;
  localBoardPath: string | null;
  localBoardDetails: BoardDetails | null;
  isLocalQueueLoaded: boolean;
}

export interface QueueStorageActions {
  setLocalQueueState: (
    queue: LocalClimbQueueItem[],
    currentItem: LocalClimbQueueItem | null,
    boardPath: string,
    boardDetails: BoardDetails,
  ) => void;
  clearLocalQueue: () => void;
  loadStoredQueue: (boardPath: string) => Promise<StoredQueueState | null>;
}

export function useQueueStorage({ activeSession, setActiveSession }: UseQueueStorageArgs): QueueStorageState & QueueStorageActions {
  const [localQueue, setLocalQueue] = useState<LocalClimbQueueItem[]>([]);
  const [localCurrentClimbQueueItem, setLocalCurrentClimbQueueItem] = useState<LocalClimbQueueItem | null>(null);
  const [localBoardPath, setLocalBoardPath] = useState<string | null>(null);
  const [localBoardDetails, setLocalBoardDetails] = useState<BoardDetails | null>(null);
  const [isLocalQueueLoaded, setIsLocalQueueLoaded] = useState(false);

  // Ref for debounced IndexedDB save timer
  const saveQueueTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up old queues from IndexedDB on mount
  useEffect(() => {
    cleanupOldQueues(30).catch((error) => {
      console.error('[PersistentSession] Failed to cleanup old queues:', error);
    });
  }, []);

  // Clean up debounced save timer on unmount
  useEffect(() => {
    return () => {
      if (saveQueueTimeoutRef.current) {
        clearTimeout(saveQueueTimeoutRef.current);
      }
    };
  }, []);

  // Auto-restore session state on mount (party session OR local queue)
  useEffect(() => {
    async function restoreState() {
      // 1. Try to restore party session first (takes priority)
      try {
        const persisted = await getPreference<ActiveSessionInfo>(ACTIVE_SESSION_KEY);
        if (persisted && persisted.sessionId && persisted.boardPath && persisted.boardDetails) {
          if (DEBUG) console.log('[PersistentSession] Restoring persisted session:', persisted.sessionId);
          setActiveSession(persisted);
          setIsLocalQueueLoaded(true);
          return;
        }
      } catch (error) {
        console.error('[PersistentSession] Failed to restore persisted session:', error);
      }

      // 2. No party session -- restore most recent local queue
      try {
        const stored = await getMostRecentQueue();
        if (stored && (stored.queue.length > 0 || stored.currentClimbQueueItem)) {
          if (DEBUG) console.log('[PersistentSession] Auto-restored most recent queue:', stored.queue.length, 'items for', stored.boardPath);
          setLocalQueue(stored.queue);
          setLocalCurrentClimbQueueItem(stored.currentClimbQueueItem);
          setLocalBoardPath(stored.boardPath);
          setLocalBoardDetails(stored.boardDetails);
        }
      } catch (error) {
        console.error('[PersistentSession] Failed to auto-restore queue:', error);
      }

      setIsLocalQueueLoaded(true);
    }

    restoreState();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only on mount

  // Debounced save to IndexedDB
  const debouncedSaveToIndexedDB = useCallback(
    (
      newQueue: LocalClimbQueueItem[],
      newCurrentItem: LocalClimbQueueItem | null,
      boardPath: string,
      boardDetails: BoardDetails,
    ) => {
      if (saveQueueTimeoutRef.current) {
        clearTimeout(saveQueueTimeoutRef.current);
      }

      saveQueueTimeoutRef.current = setTimeout(() => {
        saveQueueState({
          boardPath,
          queue: newQueue,
          currentClimbQueueItem: newCurrentItem,
          boardDetails,
          updatedAt: Date.now(),
        }).catch((error) => {
          console.error('[PersistentSession] Failed to save queue to IndexedDB:', error);
        });
      }, QUEUE_SAVE_DEBOUNCE_MS);
    },
    [],
  );

  // Local queue management functions
  const setLocalQueueState = useCallback(
    (
      newQueue: LocalClimbQueueItem[],
      newCurrentItem: LocalClimbQueueItem | null,
      boardPath: string,
      boardDetails: BoardDetails,
    ) => {
      // Don't store local queue if party mode is active
      if (activeSession) return;

      setLocalQueue(newQueue);
      setLocalCurrentClimbQueueItem(newCurrentItem);
      setLocalBoardPath(boardPath);
      setLocalBoardDetails(boardDetails);

      debouncedSaveToIndexedDB(newQueue, newCurrentItem, boardPath, boardDetails);
    },
    [activeSession, debouncedSaveToIndexedDB],
  );

  const clearLocalQueue = useCallback(() => {
    if (DEBUG) console.log('[PersistentSession] Clearing local queue');
    setLocalQueue([]);
    setLocalCurrentClimbQueueItem(null);
    setLocalBoardPath(null);
    setLocalBoardDetails(null);

    if (saveQueueTimeoutRef.current) {
      clearTimeout(saveQueueTimeoutRef.current);
      saveQueueTimeoutRef.current = null;
    }
  }, []);

  // Load stored queue from IndexedDB
  const loadStoredQueue = useCallback(async (boardPath: string): Promise<StoredQueueState | null> => {
    if (activeSession) {
      if (DEBUG) console.log('[PersistentSession] Skipping queue load - party session active');
      return null;
    }

    try {
      const stored = await getStoredQueue(boardPath);
      if (stored) {
        if (DEBUG) console.log('[PersistentSession] Loaded queue from IndexedDB:', stored.queue.length, 'items');
        setLocalQueue(stored.queue);
        setLocalCurrentClimbQueueItem(stored.currentClimbQueueItem);
        setLocalBoardPath(stored.boardPath);
        setLocalBoardDetails(stored.boardDetails);
      }
      setIsLocalQueueLoaded(true);
      return stored;
    } catch (error) {
      console.error('[PersistentSession] Failed to load queue from IndexedDB:', error);
      setIsLocalQueueLoaded(true);
      return null;
    }
  }, [activeSession]);

  return {
    localQueue,
    localCurrentClimbQueueItem,
    localBoardPath,
    localBoardDetails,
    isLocalQueueLoaded,
    setLocalQueueState,
    clearLocalQueue,
    loadStoredQueue,
  };
}
