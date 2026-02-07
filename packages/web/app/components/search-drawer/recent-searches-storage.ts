import { openDB, IDBPDatabase } from 'idb';
import { SearchRequestPagination } from '@/app/lib/types';

export type RecentSearch = {
  id: string;
  label: string;
  filters: Partial<SearchRequestPagination>;
  timestamp: number;
};

export const RECENT_SEARCHES_CHANGED_EVENT = 'boardsesh:recent-searches-changed';
const DB_NAME = 'boardsesh-recent-searches';
const DB_VERSION = 1;
const STORE_NAME = 'searches';
const STORE_KEY = 'recent';
const MAX_ITEMS = 10;

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

export function getFilterKey(filters: Partial<SearchRequestPagination>): string {
  // Exclude page/pageSize from comparison since they're not meaningful for deduplication
  const { page: _page, pageSize: _pageSize, ...rest } = filters as SearchRequestPagination;
  return JSON.stringify(rest, Object.keys(rest).sort());
}

export async function getRecentSearches(): Promise<RecentSearch[]> {
  if (typeof window === 'undefined') return [];
  try {
    const db = await initDB();
    if (!db) return [];
    const data = await db.get(STORE_NAME, STORE_KEY);
    return (data as RecentSearch[]) ?? [];
  } catch {
    return [];
  }
}

export async function addRecentSearch(label: string, filters: Partial<SearchRequestPagination>): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const existing = await getRecentSearches();
    const filterKey = getFilterKey(filters);

    // Remove duplicate if exists
    const deduplicated = existing.filter((s) => getFilterKey(s.filters) !== filterKey);

    const newEntry: RecentSearch = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      label,
      filters,
      timestamp: Date.now(),
    };

    // Add to front, cap at MAX_ITEMS
    const updated = [newEntry, ...deduplicated].slice(0, MAX_ITEMS);
    const db = await initDB();
    if (!db) return;
    await db.put(STORE_NAME, updated, STORE_KEY);
    window.dispatchEvent(new CustomEvent(RECENT_SEARCHES_CHANGED_EVENT));
  } catch {
    // Silently fail if IndexedDB is unavailable
  }
}
