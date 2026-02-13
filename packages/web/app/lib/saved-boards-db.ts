import { createIndexedDBStore } from './idb-helper';
import { BoardName } from '@/app/lib/types';

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

const getDB = createIndexedDBStore('boardsesh-config', STORE_NAME, 1, (db) => {
  if (!db.objectStoreNames.contains(STORE_NAME)) {
    db.createObjectStore(STORE_NAME, { keyPath: 'name' });
  }
});

export const loadSavedBoards = async (): Promise<StoredBoardConfig[]> => {
  try {
    const db = await getDB();
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
    const db = await getDB();
    if (!db) return;
    await db.put(STORE_NAME, config);
  } catch (error) {
    console.error('Failed to save board config:', error);
  }
};

export const deleteBoardConfig = async (configName: string): Promise<void> => {
  try {
    const db = await getDB();
    if (!db) return;
    await db.delete(STORE_NAME, configName);
  } catch (error) {
    console.error('Failed to delete board config:', error);
  }
};
