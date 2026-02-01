import { describe, it, expect } from 'vitest';
import { fnv1aHash, computeQueueStateHash } from '../hash';

describe('hash utilities', () => {
  describe('fnv1aHash', () => {
    it('should return consistent hash for same input', () => {
      const input = 'test-string';
      const hash1 = fnv1aHash(input);
      const hash2 = fnv1aHash(input);

      expect(hash1).toBe(hash2);
    });

    it('should return different hashes for different inputs', () => {
      const hash1 = fnv1aHash('input-1');
      const hash2 = fnv1aHash('input-2');

      expect(hash1).not.toBe(hash2);
    });

    it('should return 8-character hex string', () => {
      const hash = fnv1aHash('test');

      expect(hash).toMatch(/^[0-9a-f]{8}$/);
    });

    it('should handle empty string', () => {
      const hash = fnv1aHash('');

      expect(hash).toMatch(/^[0-9a-f]{8}$/);
    });
  });

  describe('computeQueueStateHash', () => {
    it('should return consistent hash for same queue state', () => {
      const queue = [{ uuid: 'item-1' }, { uuid: 'item-2' }];
      const currentItemUuid = 'item-1';

      const hash1 = computeQueueStateHash(queue, currentItemUuid);
      const hash2 = computeQueueStateHash(queue, currentItemUuid);

      expect(hash1).toBe(hash2);
    });

    it('should return different hash when queue changes', () => {
      const queue1 = [{ uuid: 'item-1' }, { uuid: 'item-2' }];
      const queue2 = [{ uuid: 'item-1' }, { uuid: 'item-3' }];
      const currentItemUuid = 'item-1';

      const hash1 = computeQueueStateHash(queue1, currentItemUuid);
      const hash2 = computeQueueStateHash(queue2, currentItemUuid);

      expect(hash1).not.toBe(hash2);
    });

    it('should return different hash when currentItemUuid changes', () => {
      const queue = [{ uuid: 'item-1' }, { uuid: 'item-2' }];

      const hash1 = computeQueueStateHash(queue, 'item-1');
      const hash2 = computeQueueStateHash(queue, 'item-2');

      expect(hash1).not.toBe(hash2);
    });

    it('should return same hash regardless of queue order (sorted internally)', () => {
      const queue1 = [{ uuid: 'item-1' }, { uuid: 'item-2' }];
      const queue2 = [{ uuid: 'item-2' }, { uuid: 'item-1' }];
      const currentItemUuid = 'item-1';

      const hash1 = computeQueueStateHash(queue1, currentItemUuid);
      const hash2 = computeQueueStateHash(queue2, currentItemUuid);

      expect(hash1).toBe(hash2);
    });

    it('should handle null currentItemUuid', () => {
      const queue = [{ uuid: 'item-1' }];

      const hash = computeQueueStateHash(queue, null);

      expect(hash).toMatch(/^[0-9a-f]{8}$/);
    });

    it('should handle empty queue', () => {
      const hash = computeQueueStateHash([], 'item-1');

      expect(hash).toMatch(/^[0-9a-f]{8}$/);
    });

    it('should handle empty queue with null currentItemUuid', () => {
      const hash = computeQueueStateHash([], null);

      expect(hash).toMatch(/^[0-9a-f]{8}$/);
    });

    // Corruption handling tests
    describe('corruption handling', () => {
      it('should filter out null items from queue', () => {
        const queue = [{ uuid: 'item-1' }, null, { uuid: 'item-2' }];
        const cleanQueue = [{ uuid: 'item-1' }, { uuid: 'item-2' }];

        const hashWithNull = computeQueueStateHash(queue, 'item-1');
        const hashClean = computeQueueStateHash(cleanQueue, 'item-1');

        expect(hashWithNull).toBe(hashClean);
      });

      it('should filter out undefined items from queue', () => {
        const queue = [{ uuid: 'item-1' }, undefined, { uuid: 'item-2' }];
        const cleanQueue = [{ uuid: 'item-1' }, { uuid: 'item-2' }];

        const hashWithUndefined = computeQueueStateHash(queue, 'item-1');
        const hashClean = computeQueueStateHash(cleanQueue, 'item-1');

        expect(hashWithUndefined).toBe(hashClean);
      });

      it('should filter out items with null uuid', () => {
        const queue = [
          { uuid: 'item-1' },
          { uuid: null as unknown as string },
          { uuid: 'item-2' },
        ];
        const cleanQueue = [{ uuid: 'item-1' }, { uuid: 'item-2' }];

        const hashWithNullUuid = computeQueueStateHash(queue, 'item-1');
        const hashClean = computeQueueStateHash(cleanQueue, 'item-1');

        expect(hashWithNullUuid).toBe(hashClean);
      });

      it('should filter out items with undefined uuid', () => {
        const queue = [
          { uuid: 'item-1' },
          { uuid: undefined as unknown as string },
          { uuid: 'item-2' },
        ];
        const cleanQueue = [{ uuid: 'item-1' }, { uuid: 'item-2' }];

        const hashWithUndefinedUuid = computeQueueStateHash(queue, 'item-1');
        const hashClean = computeQueueStateHash(cleanQueue, 'item-1');

        expect(hashWithUndefinedUuid).toBe(hashClean);
      });

      it('should handle queue with all corrupted items', () => {
        const queue = [null, undefined, { uuid: null as unknown as string }];

        const hash = computeQueueStateHash(queue, 'item-1');

        // Should be equivalent to empty queue
        const emptyHash = computeQueueStateHash([], 'item-1');
        expect(hash).toBe(emptyHash);
      });

      it('should not crash with mixed valid and corrupted items', () => {
        const queue = [
          null,
          { uuid: 'item-1' },
          undefined,
          { uuid: 'item-2' },
          { uuid: null as unknown as string },
          { uuid: 'item-3' },
        ];

        expect(() => computeQueueStateHash(queue, 'item-1')).not.toThrow();

        const hash = computeQueueStateHash(queue, 'item-1');
        expect(hash).toMatch(/^[0-9a-f]{8}$/);
      });
    });
  });
});
