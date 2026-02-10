import { describe, it, expect } from 'vitest';
import { ActivityFeedInputSchema } from '../validation/schemas';

describe('ActivityFeedInputSchema', () => {
  it('should accept empty input with defaults', () => {
    const result = ActivityFeedInputSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(20);
      expect(result.data.sortBy).toBe('new');
      expect(result.data.topPeriod).toBe('all');
      expect(result.data.cursor).toBeUndefined();
      expect(result.data.boardUuid).toBeUndefined();
    }
  });

  it('should accept custom limit', () => {
    const result = ActivityFeedInputSchema.safeParse({ limit: 10 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(10);
    }
  });

  it('should reject limit exceeding max (50)', () => {
    const result = ActivityFeedInputSchema.safeParse({ limit: 100 });
    expect(result.success).toBe(false);
  });

  it('should reject limit less than 1', () => {
    const result = ActivityFeedInputSchema.safeParse({ limit: 0 });
    expect(result.success).toBe(false);
  });

  it('should accept valid sort modes', () => {
    for (const sortBy of ['new', 'top', 'controversial', 'hot']) {
      const result = ActivityFeedInputSchema.safeParse({ sortBy });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sortBy).toBe(sortBy);
      }
    }
  });

  it('should reject invalid sort mode', () => {
    const result = ActivityFeedInputSchema.safeParse({ sortBy: 'random' });
    expect(result.success).toBe(false);
  });

  it('should accept valid time periods', () => {
    for (const topPeriod of ['hour', 'day', 'week', 'month', 'year', 'all']) {
      const result = ActivityFeedInputSchema.safeParse({ topPeriod });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.topPeriod).toBe(topPeriod);
      }
    }
  });

  it('should reject invalid time period', () => {
    const result = ActivityFeedInputSchema.safeParse({ topPeriod: 'decade' });
    expect(result.success).toBe(false);
  });

  it('should accept a valid cursor string', () => {
    const result = ActivityFeedInputSchema.safeParse({ cursor: 'abc123' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cursor).toBe('abc123');
    }
  });

  it('should reject cursor exceeding max length', () => {
    const result = ActivityFeedInputSchema.safeParse({ cursor: 'a'.repeat(501) });
    expect(result.success).toBe(false);
  });

  it('should accept null cursor', () => {
    const result = ActivityFeedInputSchema.safeParse({ cursor: null });
    expect(result.success).toBe(true);
  });

  it('should accept a valid boardUuid', () => {
    const result = ActivityFeedInputSchema.safeParse({ boardUuid: 'board-uuid-123' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.boardUuid).toBe('board-uuid-123');
    }
  });

  it('should reject boardUuid exceeding max length', () => {
    const result = ActivityFeedInputSchema.safeParse({ boardUuid: 'a'.repeat(101) });
    expect(result.success).toBe(false);
  });

  it('should accept null boardUuid', () => {
    const result = ActivityFeedInputSchema.safeParse({ boardUuid: null });
    expect(result.success).toBe(true);
  });
});
