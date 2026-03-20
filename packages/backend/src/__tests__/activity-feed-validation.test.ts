import { describe, it, expect } from 'vitest';
import { ActivityFeedInputSchema } from '../validation/schemas';

describe('ActivityFeedInputSchema', () => {
  it('should accept empty input with defaults', () => {
    const result = ActivityFeedInputSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(20);
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
