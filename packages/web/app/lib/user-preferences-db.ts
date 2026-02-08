import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'boardsesh-user-preferences';
const DB_VERSION = 1;
const STORE_NAME = 'preferences';

// Map of IDB preference keys to their legacy localStorage keys for one-time migration
const LEGACY_LOCALSTORAGE_KEYS: Record<string, string> = {
  climbListViewMode: 'climbListViewMode',
  'boardsesh:partyMode': 'boardsesh:partyMode',
};

let dbPromise: Promise<IDBPDatabase> | null = null;

const initDB = async (): Promise<IDBPDatabase | null> => {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return null;
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  }
  return dbPromise;
};

/**
 * Get a preference value from IndexedDB.
 */
export const getPreference = async <T>(key: string): Promise<T | null> => {
  try {
    const db = await initDB();
    if (!db) return null;
    const value = await db.get(STORE_NAME, key);
    if (value !== undefined) return value as T;

    // Attempt one-time migration from localStorage
    const legacyKey = LEGACY_LOCALSTORAGE_KEYS[key];
    if (legacyKey) {
      const legacyValue = localStorage.getItem(legacyKey);
      if (legacyValue !== null) {
        let parsed: unknown = legacyValue;
        try {
          parsed = JSON.parse(legacyValue);
        } catch {
          // Value is a plain string, use as-is
        }
        await db.put(STORE_NAME, parsed, key);
        localStorage.removeItem(legacyKey);
        return parsed as T;
      }
    }

    return null;
  } catch (error) {
    console.error('Failed to get preference:', error);
    return null;
  }
};

/**
 * Save a preference value to IndexedDB.
 */
export const setPreference = async <T>(key: string, value: T): Promise<void> => {
  try {
    const db = await initDB();
    if (!db) return;
    await db.put(STORE_NAME, value, key);
  } catch (error) {
    console.error('Failed to save preference:', error);
  }
};

/**
 * Remove a preference from IndexedDB.
 */
export const removePreference = async (key: string): Promise<void> => {
  try {
    const db = await initDB();
    if (!db) return;
    await db.delete(STORE_NAME, key);
  } catch (error) {
    console.error('Failed to remove preference:', error);
  }
};
