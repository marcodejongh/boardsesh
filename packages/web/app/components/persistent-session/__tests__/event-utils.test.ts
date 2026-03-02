import type { SessionUser } from '@boardsesh/shared-schema';
import { describe, expect, it } from 'vitest';
import {
  evaluateQueueEventSequence,
  insertQueueItemIdempotent,
  upsertSessionUser,
} from '../event-utils';

describe('persistent session event utils', () => {
  describe('upsertSessionUser', () => {
    const userA: SessionUser = {
      id: 'user-a',
      username: 'User A',
      isLeader: false,
      avatarUrl: undefined,
    };

    it('adds a new user when id does not exist', () => {
      const result = upsertSessionUser([], userA);
      expect(result).toEqual([userA]);
    });

    it('replaces user details when id already exists', () => {
      const updatedUserA: SessionUser = {
        ...userA,
        username: 'User A Updated',
        isLeader: true,
      };
      const result = upsertSessionUser([userA], updatedUserA);

      expect(result).toEqual([updatedUserA]);
      expect(result).toHaveLength(1);
    });
  });

  describe('insertQueueItemIdempotent', () => {
    const itemA = { uuid: 'item-a', name: 'A' };
    const itemB = { uuid: 'item-b', name: 'B' };

    it('inserts at provided position for new item', () => {
      const result = insertQueueItemIdempotent([itemA], itemB, 0);
      expect(result.map((item) => item.uuid)).toEqual(['item-b', 'item-a']);
    });

    it('does not insert duplicate item uuid', () => {
      const duplicate = { uuid: 'item-a', name: 'A duplicate payload' };
      const result = insertQueueItemIdempotent([itemA], duplicate);
      expect(result).toEqual([itemA]);
    });
  });

  describe('evaluateQueueEventSequence', () => {
    it('applies when no sequence has been received yet', () => {
      expect(evaluateQueueEventSequence(null, 1)).toBe('apply');
    });

    it('ignores stale or duplicate sequence', () => {
      expect(evaluateQueueEventSequence(10, 10)).toBe('ignore-stale');
      expect(evaluateQueueEventSequence(10, 9)).toBe('ignore-stale');
    });

    it('detects a gap when sequence jumps ahead', () => {
      expect(evaluateQueueEventSequence(10, 12)).toBe('gap');
    });

    it('applies when sequence is the next expected value', () => {
      expect(evaluateQueueEventSequence(10, 11)).toBe('apply');
    });
  });
});
