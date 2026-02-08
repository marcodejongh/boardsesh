import 'fake-indexeddb/auto';
import { openDB } from 'idb';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  getRecentSearches,
  addRecentSearch,
  getFilterKey,
  type RecentSearch,
} from '../recent-searches-storage';

const DB_NAME = 'boardsesh-recent-searches';
const STORE_NAME = 'searches';

beforeEach(async () => {
  localStorage.clear();
  const db = await openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });
  await db.clear(STORE_NAME);
  db.close();
});

describe('recent-searches-storage', () => {
  describe('getRecentSearches', () => {
    it('should return empty array when no searches exist', async () => {
      const result = await getRecentSearches();
      expect(result).toEqual([]);
    });
  });

  describe('addRecentSearch', () => {
    it('should add a search and retrieve it', async () => {
      await addRecentSearch('Test search', { minGrade: 10 });
      const results = await getRecentSearches();
      expect(results).toHaveLength(1);
      expect(results[0].label).toBe('Test search');
      expect(results[0].filters).toEqual({ minGrade: 10 });
    });

    it('should add new searches to the front', async () => {
      await addRecentSearch('First', { minGrade: 5 });
      await addRecentSearch('Second', { minGrade: 10 });
      const results = await getRecentSearches();
      expect(results).toHaveLength(2);
      expect(results[0].label).toBe('Second');
      expect(results[1].label).toBe('First');
    });

    it('should deduplicate searches with the same filters', async () => {
      await addRecentSearch('Search A', { minGrade: 10 });
      await addRecentSearch('Search B', { minGrade: 10 });
      const results = await getRecentSearches();
      expect(results).toHaveLength(1);
      expect(results[0].label).toBe('Search B');
    });

    it('should cap at 10 items', async () => {
      for (let i = 0; i < 12; i++) {
        await addRecentSearch(`Search ${i}`, { minGrade: i });
      }
      const results = await getRecentSearches();
      expect(results).toHaveLength(10);
      expect(results[0].label).toBe('Search 11');
    });
  });

  describe('getFilterKey', () => {
    it('should exclude page and pageSize from the key', () => {
      const key1 = getFilterKey({ minGrade: 10, page: 1, pageSize: 20 });
      const key2 = getFilterKey({ minGrade: 10, page: 5, pageSize: 50 });
      expect(key1).toBe(key2);
    });

    it('should produce different keys for different filters', () => {
      const key1 = getFilterKey({ minGrade: 10 });
      const key2 = getFilterKey({ minGrade: 20 });
      expect(key1).not.toBe(key2);
    });
  });

  describe('localStorage migration', () => {
    it('should migrate recent searches from localStorage on first read', async () => {
      const legacyData: RecentSearch[] = [
        {
          id: 'legacy-1',
          label: 'Old search',
          filters: { minGrade: 5 },
          timestamp: Date.now() - 1000,
        },
      ];
      localStorage.setItem('boardsesh_recent_searches', JSON.stringify(legacyData));

      const results = await getRecentSearches();
      expect(results).toHaveLength(1);
      expect(results[0].label).toBe('Old search');
      expect(results[0].id).toBe('legacy-1');

      // localStorage key should be cleaned up
      expect(localStorage.getItem('boardsesh_recent_searches')).toBeNull();
    });

    it('should not re-migrate if IndexedDB already has data', async () => {
      // Add something to IndexedDB first
      await addRecentSearch('New search', { minGrade: 10 });

      // Set legacy data in localStorage
      const legacyData: RecentSearch[] = [
        {
          id: 'legacy-1',
          label: 'Old search',
          filters: { minGrade: 5 },
          timestamp: Date.now() - 1000,
        },
      ];
      localStorage.setItem('boardsesh_recent_searches', JSON.stringify(legacyData));

      const results = await getRecentSearches();
      expect(results).toHaveLength(1);
      expect(results[0].label).toBe('New search');

      // localStorage should remain since migration was skipped
      expect(localStorage.getItem('boardsesh_recent_searches')).not.toBeNull();
    });

    it('should persist migrated data for subsequent reads', async () => {
      const legacyData: RecentSearch[] = [
        {
          id: 'legacy-1',
          label: 'Old search',
          filters: { minGrade: 5 },
          timestamp: Date.now(),
        },
      ];
      localStorage.setItem('boardsesh_recent_searches', JSON.stringify(legacyData));

      // First read triggers migration
      await getRecentSearches();

      // Second read should return from IndexedDB
      const results = await getRecentSearches();
      expect(results).toHaveLength(1);
      expect(results[0].label).toBe('Old search');
    });
  });
});
