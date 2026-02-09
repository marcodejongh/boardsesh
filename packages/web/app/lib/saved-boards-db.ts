import { openDB, IDBPDatabase } from 'idb';
import { BoardName } from '@/app/lib/types';

const DB_NAME = 'boardsesh-config';
const DB_VERSION = 1;
const STORE_NAME = 'board-configurations';

export type StoredBoardConfig = {
  name: string;
  board: BoardName;
  layoutId: number;
  sizeId: number;
  setIds: number[];
  angle: number;
  createdAt: string;
  lastUsed?: string;
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
          db.createObjectStore(STORE_NAME, { keyPath: 'name' });
        }
      },
    });
  }
  return dbPromise;
};

export const loadSavedBoards = async (): Promise<StoredBoardConfig[]> => {
  try {
    const db = await initDB();
    if (!db) return [];
    const allConfigs = await db.getAll(STORE_NAME);
    return allConfigs.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  } catch (error) {
    console.error('Failed to load saved boards:', error);
    return [];
  }
};

export const saveBoardConfig = async (config: StoredBoardConfig): Promise<void> => {
  try {
    const db = await initDB();
    if (!db) return;
    await db.put(STORE_NAME, config);
  } catch (error) {
    console.error('Failed to save board config:', error);
  }
};

export const deleteBoardConfig = async (configName: string): Promise<void> => {
  try {
    const db = await initDB();
    if (!db) return;
    await db.delete(STORE_NAME, configName);
  } catch (error) {
    console.error('Failed to delete board config:', error);
  }
};
