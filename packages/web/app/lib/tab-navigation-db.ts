import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'boardsesh-tab-navigation';
const DB_VERSION = 1;
const STORE_NAME = 'tab-state';

export interface TabNavigationState {
  activeTab: string;
  lastUrls: Record<string, string>;
}

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

/**
 * Get the tab navigation state for a given board context (base path).
 */
export const getTabNavigationState = async (basePath: string): Promise<TabNavigationState | null> => {
  try {
    const db = await initDB();
    return await db.get(STORE_NAME, basePath);
  } catch (error) {
    console.error('Failed to get tab navigation state:', error);
    return null;
  }
};

/**
 * Save the tab navigation state for a given board context (base path).
 */
export const saveTabNavigationState = async (basePath: string, state: TabNavigationState): Promise<void> => {
  try {
    const db = await initDB();
    await db.put(STORE_NAME, state, basePath);
  } catch (error) {
    console.error('Failed to save tab navigation state:', error);
  }
};
