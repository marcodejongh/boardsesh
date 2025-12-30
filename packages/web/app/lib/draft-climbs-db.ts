import { openDB, IDBPDatabase } from 'idb';
import { v4 as uuidv4 } from 'uuid';
import { BoardName } from './types';
import { LitUpHoldsMap } from '../components/board-renderer/types';

const DB_NAME = 'boardsesh-drafts';
const DB_VERSION = 1;
const STORE_NAME = 'drafts';

export interface DraftClimb {
  uuid: string;
  boardName: BoardName;
  layoutId: number;
  sizeId: number;
  setIds: number[];
  angle: number;
  // Names for URL generation
  layoutName?: string;
  sizeName?: string;
  sizeDescription?: string;
  setNames?: string[];
  // Form data
  name: string;
  description: string;
  frames: string;
  litUpHoldsMap: LitUpHoldsMap;
  isDraft: boolean;
  createdAt: number;
  updatedAt: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

const initDB = async (): Promise<IDBPDatabase> => {
  // Guard against SSR - IndexedDB is browser-only
  if (typeof window === 'undefined') {
    throw new Error('IndexedDB is not available in server-side rendering');
  }

  if (!dbPromise) {
    const promise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'uuid' });
          // Index for querying by board configuration
          store.createIndex('by-board', ['boardName', 'layoutId', 'sizeId'], { unique: false });
          store.createIndex('by-updated', 'updatedAt', { unique: false });
        }
      },
    });

    // Clear the promise on error so we can retry
    promise.catch(() => {
      dbPromise = null;
    });

    dbPromise = promise;
  }
  return dbPromise;
};

export interface CreateDraftOptions {
  boardName: BoardName;
  layoutId: number;
  sizeId: number;
  setIds: number[];
  angle: number;
  layoutName?: string;
  sizeName?: string;
  sizeDescription?: string;
  setNames?: string[];
}

/**
 * Create a new draft climb with a UUID
 */
export const createDraftClimb = async (options: CreateDraftOptions): Promise<DraftClimb> => {
  const now = Date.now();
  const draft: DraftClimb = {
    uuid: uuidv4(),
    boardName: options.boardName,
    layoutId: options.layoutId,
    sizeId: options.sizeId,
    setIds: options.setIds,
    angle: options.angle,
    layoutName: options.layoutName,
    sizeName: options.sizeName,
    sizeDescription: options.sizeDescription,
    setNames: options.setNames,
    name: '',
    description: '',
    frames: '',
    litUpHoldsMap: {},
    isDraft: false,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const db = await initDB();
    await db.put(STORE_NAME, draft);
    return draft;
  } catch (error) {
    console.error('Failed to create draft climb:', error);
    throw error;
  }
};

/**
 * Update a draft climb
 */
export const updateDraftClimb = async (
  uuid: string,
  updates: Partial<Omit<DraftClimb, 'uuid' | 'createdAt'>>,
): Promise<void> => {
  try {
    const db = await initDB();
    const existing = await db.get(STORE_NAME, uuid);
    if (!existing) {
      throw new Error(`Draft with uuid ${uuid} not found`);
    }

    const updated: DraftClimb = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    };

    await db.put(STORE_NAME, updated);
  } catch (error) {
    console.error('Failed to update draft climb:', error);
    throw error;
  }
};

/**
 * Get a draft climb by UUID
 */
export const getDraftClimb = async (uuid: string): Promise<DraftClimb | null> => {
  try {
    const db = await initDB();
    const draft = await db.get(STORE_NAME, uuid);
    return draft ?? null;
  } catch (error) {
    console.error('Failed to get draft climb:', error);
    return null;
  }
};

/**
 * Get all draft climbs, sorted by updatedAt (newest first)
 */
export const getAllDraftClimbs = async (): Promise<DraftClimb[]> => {
  try {
    const db = await initDB();
    const drafts = await db.getAll(STORE_NAME);
    return drafts.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (error) {
    console.error('Failed to get all draft climbs:', error);
    return [];
  }
};

/**
 * Get draft climbs for a specific board configuration
 */
export const getDraftClimbsForBoard = async (
  boardName: BoardName,
  layoutId: number,
  sizeId: number,
): Promise<DraftClimb[]> => {
  try {
    const db = await initDB();
    const index = db.transaction(STORE_NAME).store.index('by-board');
    const drafts = await index.getAll([boardName, layoutId, sizeId]);
    return drafts.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (error) {
    console.error('Failed to get draft climbs for board:', error);
    return [];
  }
};

/**
 * Delete a draft climb
 */
export const deleteDraftClimb = async (uuid: string): Promise<void> => {
  try {
    const db = await initDB();
    await db.delete(STORE_NAME, uuid);
  } catch (error) {
    console.error('Failed to delete draft climb:', error);
    throw error;
  }
};

/**
 * Delete all draft climbs
 */
export const deleteAllDraftClimbs = async (): Promise<void> => {
  try {
    const db = await initDB();
    await db.clear(STORE_NAME);
  } catch (error) {
    console.error('Failed to delete all draft climbs:', error);
    throw error;
  }
};

/**
 * Get the count of all draft climbs
 */
export const getDraftClimbsCount = async (): Promise<number> => {
  try {
    const db = await initDB();
    return await db.count(STORE_NAME);
  } catch (error) {
    console.error('Failed to count draft climbs:', error);
    return 0;
  }
};

/**
 * Reorder drafts by updating their updatedAt timestamps to preserve order
 * The first item in the array will have the newest timestamp (appears first when sorted)
 */
export const reorderDraftClimbs = async (orderedUuids: string[]): Promise<void> => {
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    // Update timestamps in reverse order so first item has newest timestamp
    const now = Date.now();
    for (let i = orderedUuids.length - 1; i >= 0; i--) {
      const uuid = orderedUuids[i];
      const draft = await store.get(uuid);
      if (draft) {
        // Give each draft a unique timestamp, with earlier items getting newer timestamps
        draft.updatedAt = now + (orderedUuids.length - i);
        await store.put(draft);
      }
    }

    await tx.done;
  } catch (error) {
    console.error('Failed to reorder draft climbs:', error);
    throw error;
  }
};
