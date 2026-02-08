import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'boardsesh-user-preferences';
const DB_VERSION = 1;
const STORE_NAME = 'preferences';

let dbPromise: Promise<IDBPDatabase> | null = null;

const initDB = async (): Promise<IDBPDatabase> => {
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

export const getAlwaysTickInApp = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false;
  try {
    const db = await initDB();
    const value = await db.get(STORE_NAME, 'alwaysTickInApp');
    return value === true;
  } catch (error) {
    console.error('Failed to get alwaysTickInApp preference:', error);
    return false;
  }
};

export const setAlwaysTickInApp = async (enabled: boolean): Promise<void> => {
  if (typeof window === 'undefined') return;
  try {
    const db = await initDB();
    await db.put(STORE_NAME, enabled, 'alwaysTickInApp');
  } catch (error) {
    console.error('Failed to set alwaysTickInApp preference:', error);
  }
};
