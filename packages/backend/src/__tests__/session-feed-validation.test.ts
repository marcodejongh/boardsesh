import { describe, it, expect } from 'vitest';
import { ActivityFeedInputSchema } from '../validation/schemas';

describe('Session Feed Input Validation', () => {
  describe('ActivityFeedInputSchema (used by sessionGroupedFeed)', () => {
    it('provides defaults for missing fields', () => {
      const result = ActivityFeedInputSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sortBy).toBe('new');
        expect(result.data.limit).toBe(20);
        expect(result.data.topPeriod).toBe('all');
      }
    });

    it('accepts all valid sort modes', () => {
      for (const sortBy of ['new', 'top', 'controversial', 'hot']) {
        const result = ActivityFeedInputSchema.safeParse({ sortBy });
        expect(result.success).toBe(true);
      }
    });

    it('rejects unknown sort mode', () => {
      const result = ActivityFeedInputSchema.safeParse({ sortBy: 'random' });
      expect(result.success).toBe(false);
    });

    it('rejects negative limit', () => {
      const result = ActivityFeedInputSchema.safeParse({ limit: -1 });
      expect(result.success).toBe(false);
    });

    it('rejects zero limit', () => {
      const result = ActivityFeedInputSchema.safeParse({ limit: 0 });
      expect(result.success).toBe(false);
    });

    it('rejects limit over 50', () => {
      const result = ActivityFeedInputSchema.safeParse({ limit: 51 });
      expect(result.success).toBe(false);
    });

    it('accepts valid boardUuid', () => {
      const result = ActivityFeedInputSchema.safeParse({ boardUuid: 'abc-123' });
      expect(result.success).toBe(true);
    });

    it('accepts null boardUuid', () => {
      const result = ActivityFeedInputSchema.safeParse({ boardUuid: null });
      expect(result.success).toBe(true);
    });

    it('accepts all valid time periods', () => {
      for (const topPeriod of ['hour', 'day', 'week', 'month', 'year', 'all']) {
        const result = ActivityFeedInputSchema.safeParse({ topPeriod });
        expect(result.success).toBe(true);
      }
    });

    it('accepts valid cursor string', () => {
      const result = ActivityFeedInputSchema.safeParse({ cursor: 'abc123' });
      expect(result.success).toBe(true);
    });
  });
});
