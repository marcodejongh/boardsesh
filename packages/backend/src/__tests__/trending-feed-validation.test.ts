import { describe, it, expect } from 'vitest';
import { TrendingClimbFeedInputSchema } from '../validation/schemas';

describe('TrendingClimbFeedInputSchema', () => {
  it('should accept empty input with defaults', () => {
    const result = TrendingClimbFeedInputSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(20);
      expect(result.data.offset).toBe(0);
      expect(result.data.timePeriodDays).toBe(7);
      expect(result.data.boardUuid).toBeUndefined();
    }
  });

  it('should accept custom limit', () => {
    const result = TrendingClimbFeedInputSchema.safeParse({ limit: 50 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(50);
    }
  });

  it('should reject limit exceeding max (100)', () => {
    const result = TrendingClimbFeedInputSchema.safeParse({ limit: 101 });
    expect(result.success).toBe(false);
  });

  it('should reject limit less than 1', () => {
    const result = TrendingClimbFeedInputSchema.safeParse({ limit: 0 });
    expect(result.success).toBe(false);
  });

  it('should accept valid offset', () => {
    const result = TrendingClimbFeedInputSchema.safeParse({ offset: 40 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.offset).toBe(40);
    }
  });

  it('should reject negative offset', () => {
    const result = TrendingClimbFeedInputSchema.safeParse({ offset: -1 });
    expect(result.success).toBe(false);
  });

  it('should accept valid timePeriodDays values', () => {
    for (const days of [1, 7, 14, 30, 90]) {
      const result = TrendingClimbFeedInputSchema.safeParse({ timePeriodDays: days });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.timePeriodDays).toBe(days);
      }
    }
  });

  it('should reject timePeriodDays exceeding max (90)', () => {
    const result = TrendingClimbFeedInputSchema.safeParse({ timePeriodDays: 91 });
    expect(result.success).toBe(false);
  });

  it('should reject timePeriodDays less than 1', () => {
    const result = TrendingClimbFeedInputSchema.safeParse({ timePeriodDays: 0 });
    expect(result.success).toBe(false);
  });

  it('should accept a valid boardUuid', () => {
    const result = TrendingClimbFeedInputSchema.safeParse({ boardUuid: 'board-uuid-123' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.boardUuid).toBe('board-uuid-123');
    }
  });

  it('should accept null boardUuid', () => {
    const result = TrendingClimbFeedInputSchema.safeParse({ boardUuid: null });
    expect(result.success).toBe(true);
  });

  it('should reject boardUuid exceeding max length', () => {
    const result = TrendingClimbFeedInputSchema.safeParse({ boardUuid: 'a'.repeat(101) });
    expect(result.success).toBe(false);
  });

  it('should accept full valid input', () => {
    const result = TrendingClimbFeedInputSchema.safeParse({
      limit: 10,
      offset: 20,
      boardUuid: 'my-board',
      timePeriodDays: 30,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        limit: 10,
        offset: 20,
        boardUuid: 'my-board',
        timePeriodDays: 30,
      });
    }
  });
});
