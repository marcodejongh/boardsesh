import { openDB, IDBPDatabase } from 'idb';
import { coordinateToHoldId, MOONBOARD_HOLD_STATES, type MoonBoardCoordinate } from './moonboard-config';
import type { MoonBoardLitUpHoldsMap } from '../components/moonboard-renderer/types';

const DB_NAME = 'boardsesh-moonboard';
const DB_VERSION = 1;
const STORE_NAME = 'climbs';

export interface MoonBoardStoredClimb {
  id: string;
  name: string;
  description: string;
  holds: {
    start: string[];
    hand: string[];
    finish: string[];
  };
  angle: number;
  layoutFolder: string;
  createdAt: string;
  importedFrom?: string;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

const initDB = async (): Promise<IDBPDatabase> => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('layoutFolder', 'layoutFolder', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      },
    });
  }
  return dbPromise;
};

/**
 * Get all moonboard climbs from IndexedDB
 */
export const getMoonBoardClimbs = async (): Promise<MoonBoardStoredClimb[]> => {
  try {
    const db = await initDB();
    return await db.getAll(STORE_NAME);
  } catch (error) {
    console.error('Failed to get moonboard climbs:', error);
    return [];
  }
};

/**
 * Get moonboard climbs by layout folder
 */
export const getMoonBoardClimbsByLayout = async (layoutFolder: string): Promise<MoonBoardStoredClimb[]> => {
  try {
    const db = await initDB();
    return await db.getAllFromIndex(STORE_NAME, 'layoutFolder', layoutFolder);
  } catch (error) {
    console.error('Failed to get moonboard climbs by layout:', error);
    return [];
  }
};

/**
 * Save a moonboard climb to IndexedDB
 */
export const saveMoonBoardClimb = async (climb: Omit<MoonBoardStoredClimb, 'id'>): Promise<MoonBoardStoredClimb> => {
  const db = await initDB();
  const climbWithId: MoonBoardStoredClimb = {
    ...climb,
    id: crypto.randomUUID(),
  };
  await db.put(STORE_NAME, climbWithId);
  return climbWithId;
};

/**
 * Save multiple moonboard climbs to IndexedDB
 */
export const saveMoonBoardClimbs = async (
  climbs: Array<Omit<MoonBoardStoredClimb, 'id'>>,
): Promise<MoonBoardStoredClimb[]> => {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');

  const savedClimbs: MoonBoardStoredClimb[] = climbs.map((climb) => ({
    ...climb,
    id: crypto.randomUUID(),
  }));

  await Promise.all([...savedClimbs.map((climb) => tx.store.put(climb)), tx.done]);

  return savedClimbs;
};

/**
 * Delete a moonboard climb from IndexedDB
 */
export const deleteMoonBoardClimb = async (id: string): Promise<void> => {
  try {
    const db = await initDB();
    await db.delete(STORE_NAME, id);
  } catch (error) {
    console.error('Failed to delete moonboard climb:', error);
    throw error;
  }
};

/**
 * Convert OCR hold coordinates to the lit up holds map format for the renderer
 * This is a shared utility used by both the create form and bulk import
 */
export function convertOcrHoldsToMap(holds: {
  start: string[];
  hand: string[];
  finish: string[];
}): MoonBoardLitUpHoldsMap {
  const map: MoonBoardLitUpHoldsMap = {};

  holds.start.forEach((coord) => {
    const holdId = coordinateToHoldId(coord as MoonBoardCoordinate);
    map[holdId] = { type: 'start', color: MOONBOARD_HOLD_STATES.start.color };
  });

  holds.hand.forEach((coord) => {
    const holdId = coordinateToHoldId(coord as MoonBoardCoordinate);
    map[holdId] = { type: 'hand', color: MOONBOARD_HOLD_STATES.hand.color };
  });

  holds.finish.forEach((coord) => {
    const holdId = coordinateToHoldId(coord as MoonBoardCoordinate);
    map[holdId] = { type: 'finish', color: MOONBOARD_HOLD_STATES.finish.color };
  });

  return map;
}
