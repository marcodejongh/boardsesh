import { describe, it, expect } from 'vitest';
import {
  FollowInputSchema,
  FollowListInputSchema,
  SearchUsersInputSchema,
  FollowingAscentsFeedInputSchema,
} from '../validation/schemas';

describe('Social Validation Schemas', () => {
  describe('FollowInputSchema', () => {
    it('should accept a valid user ID', () => {
      const result = FollowInputSchema.safeParse({ userId: 'user-123' });
      expect(result.success).toBe(true);
    });

    it('should reject an empty user ID', () => {
      const result = FollowInputSchema.safeParse({ userId: '' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('cannot be empty');
      }
    });

    it('should reject missing userId', () => {
      const result = FollowInputSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('FollowListInputSchema', () => {
    it('should accept valid input with defaults', () => {
      const result = FollowListInputSchema.safeParse({ userId: 'user-123' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20);
        expect(result.data.offset).toBe(0);
      }
    });

    it('should accept custom limit and offset', () => {
      const result = FollowListInputSchema.safeParse({
        userId: 'user-123',
        limit: 10,
        offset: 5,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(10);
        expect(result.data.offset).toBe(5);
      }
    });

    it('should reject limit exceeding max (50)', () => {
      const result = FollowListInputSchema.safeParse({
        userId: 'user-123',
        limit: 100,
      });
      expect(result.success).toBe(false);
    });

    it('should reject limit less than 1', () => {
      const result = FollowListInputSchema.safeParse({
        userId: 'user-123',
        limit: 0,
      });
      expect(result.success).toBe(false);
    });

    it('should reject negative offset', () => {
      const result = FollowListInputSchema.safeParse({
        userId: 'user-123',
        offset: -1,
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty userId', () => {
      const result = FollowListInputSchema.safeParse({
        userId: '',
        limit: 10,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('SearchUsersInputSchema', () => {
    it('should accept a valid query', () => {
      const result = SearchUsersInputSchema.safeParse({ query: 'john' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20);
        expect(result.data.offset).toBe(0);
      }
    });

    it('should reject query shorter than 2 characters', () => {
      const result = SearchUsersInputSchema.safeParse({ query: 'a' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 2 characters');
      }
    });

    it('should reject query longer than 100 characters', () => {
      const result = SearchUsersInputSchema.safeParse({ query: 'a'.repeat(101) });
      expect(result.success).toBe(false);
    });

    it('should accept optional boardType', () => {
      const result = SearchUsersInputSchema.safeParse({
        query: 'john',
        boardType: 'kilter',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.boardType).toBe('kilter');
      }
    });

    it('should accept custom limit and offset', () => {
      const result = SearchUsersInputSchema.safeParse({
        query: 'john',
        limit: 5,
        offset: 10,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(5);
        expect(result.data.offset).toBe(10);
      }
    });

    it('should reject limit exceeding max (50)', () => {
      const result = SearchUsersInputSchema.safeParse({
        query: 'john',
        limit: 51,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('FollowingAscentsFeedInputSchema', () => {
    it('should accept empty input with defaults', () => {
      const result = FollowingAscentsFeedInputSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20);
        expect(result.data.offset).toBe(0);
      }
    });

    it('should accept custom limit and offset', () => {
      const result = FollowingAscentsFeedInputSchema.safeParse({
        limit: 10,
        offset: 20,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(10);
        expect(result.data.offset).toBe(20);
      }
    });

    it('should reject limit exceeding max (50)', () => {
      const result = FollowingAscentsFeedInputSchema.safeParse({
        limit: 100,
      });
      expect(result.success).toBe(false);
    });

    it('should reject negative offset', () => {
      const result = FollowingAscentsFeedInputSchema.safeParse({
        offset: -5,
      });
      expect(result.success).toBe(false);
    });
  });
});
