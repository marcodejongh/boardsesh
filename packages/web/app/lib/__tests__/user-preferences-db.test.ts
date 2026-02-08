import 'fake-indexeddb/auto';
import { openDB } from 'idb';
import { beforeEach, describe, expect, it } from 'vitest';
import { getPreference, setPreference, removePreference } from '../user-preferences-db';

const DB_NAME = 'boardsesh-user-preferences';
const STORE_NAME = 'preferences';

beforeEach(async () => {
  localStorage.clear();
  // Clear the store contents using a separate short-lived connection
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

describe('user-preferences-db', () => {
  describe('setPreference / getPreference', () => {
    it('should store and retrieve a string preference', async () => {
      await setPreference('testKey', 'testValue');
      const result = await getPreference<string>('testKey');
      expect(result).toBe('testValue');
    });

    it('should store and retrieve an object preference', async () => {
      const obj = { foo: 'bar', num: 42 };
      await setPreference('objKey', obj);
      const result = await getPreference<typeof obj>('objKey');
      expect(result).toEqual(obj);
    });

    it('should return null for a non-existent key', async () => {
      const result = await getPreference<string>('nonexistent');
      expect(result).toBeNull();
    });

    it('should overwrite an existing preference', async () => {
      await setPreference('key', 'first');
      await setPreference('key', 'second');
      const result = await getPreference<string>('key');
      expect(result).toBe('second');
    });
  });

  describe('removePreference', () => {
    it('should remove an existing preference', async () => {
      await setPreference('toRemove', 'value');
      await removePreference('toRemove');
      const result = await getPreference<string>('toRemove');
      expect(result).toBeNull();
    });

    it('should not throw when removing a non-existent key', async () => {
      await expect(removePreference('nonexistent')).resolves.toBeUndefined();
    });
  });

  describe('localStorage migration', () => {
    it('should migrate climbListViewMode from localStorage on first read', async () => {
      localStorage.setItem('climbListViewMode', 'grid');

      const result = await getPreference<string>('climbListViewMode');
      expect(result).toBe('grid');

      // localStorage key should be cleaned up
      expect(localStorage.getItem('climbListViewMode')).toBeNull();
    });

    it('should migrate boardsesh:partyMode from localStorage on first read', async () => {
      localStorage.setItem('boardsesh:partyMode', 'backend');

      const result = await getPreference<string>('boardsesh:partyMode');
      expect(result).toBe('backend');

      expect(localStorage.getItem('boardsesh:partyMode')).toBeNull();
    });

    it('should not re-migrate if IndexedDB already has the value', async () => {
      // Pre-populate IndexedDB
      await setPreference('climbListViewMode', 'list');

      // Set a different value in localStorage (simulating stale data)
      localStorage.setItem('climbListViewMode', 'grid');

      const result = await getPreference<string>('climbListViewMode');
      expect(result).toBe('list');

      // localStorage should remain untouched since migration was skipped
      expect(localStorage.getItem('climbListViewMode')).toBe('grid');
    });

    it('should return null when neither IndexedDB nor localStorage has the value', async () => {
      const result = await getPreference<string>('climbListViewMode');
      expect(result).toBeNull();
    });

    it('should not attempt migration for keys without a legacy mapping', async () => {
      localStorage.setItem('someOtherKey', 'value');

      const result = await getPreference<string>('someOtherKey');
      expect(result).toBeNull();

      // localStorage should be untouched
      expect(localStorage.getItem('someOtherKey')).toBe('value');
    });

    it('should parse JSON values during migration', async () => {
      localStorage.setItem('climbListViewMode', JSON.stringify({ mode: 'grid' }));

      const result = await getPreference<{ mode: string }>('climbListViewMode');
      expect(result).toEqual({ mode: 'grid' });

      expect(localStorage.getItem('climbListViewMode')).toBeNull();
    });

    it('should persist migrated value so subsequent reads come from IndexedDB', async () => {
      localStorage.setItem('climbListViewMode', 'grid');

      // First read triggers migration
      await getPreference<string>('climbListViewMode');

      // Second read should return from IndexedDB (localStorage is already cleared)
      const result = await getPreference<string>('climbListViewMode');
      expect(result).toBe('grid');
    });
  });
});
