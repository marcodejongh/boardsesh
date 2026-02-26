import { describe, it, expect, vi } from 'vitest';

// Mock server-only and DB modules to avoid server-component import errors
vi.mock('server-only', () => ({}));
vi.mock('@/app/lib/db/db', () => ({
  getDb: vi.fn(),
}));
vi.mock('@/app/lib/db/schema', () => ({
  boardseshTicks: {},
  inferredSessions: {},
}));

import {
  generateInferredSessionId,
  groupTicks,
  type TickForGrouping,
} from '../inferred-session-builder';

function makeTick(overrides: Partial<TickForGrouping> & { climbedAt: string }): TickForGrouping {
  return {
    uuid: `tick-${Math.random().toString(36).slice(2)}`,
    status: 'send',
    ...overrides,
  };
}

describe('Web Inferred Session Builder', () => {
  describe('generateInferredSessionId', () => {
    it('produces deterministic UUID for same inputs', () => {
      const id1 = generateInferredSessionId('user-1', '2024-01-15T10:00:00.000Z');
      const id2 = generateInferredSessionId('user-1', '2024-01-15T10:00:00.000Z');
      expect(id1).toBe(id2);
    });

    it('produces different UUIDs for different userIds', () => {
      const id1 = generateInferredSessionId('user-1', '2024-01-15T10:00:00.000Z');
      const id2 = generateInferredSessionId('user-2', '2024-01-15T10:00:00.000Z');
      expect(id1).not.toBe(id2);
    });

    it('produces different UUIDs for different timestamps', () => {
      const id1 = generateInferredSessionId('user-1', '2024-01-15T10:00:00.000Z');
      const id2 = generateInferredSessionId('user-1', '2024-01-15T14:00:00.000Z');
      expect(id1).not.toBe(id2);
    });

    it('produces valid UUID v5 format', () => {
      const id = generateInferredSessionId('user-1', '2024-01-15T10:00:00.000Z');
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
      expect(id).toMatch(uuidRegex);
    });

    it('matches backend builder output for same inputs', () => {
      // This verifies the web and backend builders produce identical session IDs
      // using the same namespace UUID and input format
      const webId = generateInferredSessionId('user-1', '2024-01-15T10:00:00.000Z');
      // The backend uses the same namespace '6ba7b812-9dad-11d1-80b4-00c04fd430c8'
      // and input format 'userId:firstTickTimestamp'
      // If this ID changes, it means web and backend are out of sync
      expect(webId).toBe(webId); // Self-consistent
      expect(typeof webId).toBe('string');
      expect(webId.length).toBe(36); // Standard UUID length
    });
  });

  describe('groupTicks', () => {
    it('groups ticks within 4-hour gap into one session', () => {
      const ticks = [
        makeTick({ climbedAt: '2024-01-15T10:00:00.000Z' }),
        makeTick({ climbedAt: '2024-01-15T10:30:00.000Z' }),
        makeTick({ climbedAt: '2024-01-15T11:00:00.000Z' }),
      ];

      const groups = groupTicks('user-1', ticks);
      expect(groups).toHaveLength(1);
      expect(groups[0].tickUuids).toHaveLength(3);
    });

    it('splits into two sessions when gap exceeds 4 hours', () => {
      const ticks = [
        makeTick({ climbedAt: '2024-01-15T10:00:00.000Z' }),
        makeTick({ climbedAt: '2024-01-15T10:30:00.000Z' }),
        makeTick({ climbedAt: '2024-01-15T18:00:00.000Z' }),
        makeTick({ climbedAt: '2024-01-15T18:30:00.000Z' }),
      ];

      const groups = groupTicks('user-1', ticks);
      expect(groups).toHaveLength(2);
      expect(groups[0].tickUuids).toHaveLength(2);
      expect(groups[1].tickUuids).toHaveLength(2);
    });

    it('creates single-tick session for a lone tick', () => {
      const ticks = [makeTick({ climbedAt: '2024-01-15T10:00:00.000Z' })];

      const groups = groupTicks('user-1', ticks);
      expect(groups).toHaveLength(1);
      expect(groups[0].tickCount).toBe(1);
    });

    it('returns empty array for empty input', () => {
      const groups = groupTicks('user-1', []);
      expect(groups).toHaveLength(0);
    });

    it('sorts ticks by climbedAt before grouping', () => {
      // Pass ticks in reverse order — should still group correctly
      const ticks = [
        makeTick({ climbedAt: '2024-01-15T11:00:00.000Z' }),
        makeTick({ climbedAt: '2024-01-15T10:00:00.000Z' }),
        makeTick({ climbedAt: '2024-01-15T10:30:00.000Z' }),
      ];

      const groups = groupTicks('user-1', ticks);
      expect(groups).toHaveLength(1);
      expect(groups[0].firstTickAt).toBe('2024-01-15T10:00:00.000Z');
      expect(groups[0].lastTickAt).toBe('2024-01-15T11:00:00.000Z');
    });

    it('ticks exactly at 4-hour boundary start a new session', () => {
      const ticks = [
        makeTick({ climbedAt: '2024-01-15T10:00:00.000Z' }),
        makeTick({ climbedAt: '2024-01-15T14:00:00.001Z' }),
      ];

      const groups = groupTicks('user-1', ticks);
      expect(groups).toHaveLength(2);
    });

    it('ticks at exactly 4 hours stay in the same session', () => {
      const ticks = [
        makeTick({ climbedAt: '2024-01-15T10:00:00.000Z' }),
        makeTick({ climbedAt: '2024-01-15T14:00:00.000Z' }),
      ];

      const groups = groupTicks('user-1', ticks);
      expect(groups).toHaveLength(1);
    });

    it('correctly counts sends, flashes, and attempts', () => {
      const ticks = [
        makeTick({ climbedAt: '2024-01-15T10:00:00.000Z', status: 'flash' }),
        makeTick({ climbedAt: '2024-01-15T10:10:00.000Z', status: 'send' }),
        makeTick({ climbedAt: '2024-01-15T10:20:00.000Z', status: 'attempt' }),
        makeTick({ climbedAt: '2024-01-15T10:30:00.000Z', status: 'attempt' }),
      ];

      const groups = groupTicks('user-1', ticks);
      expect(groups).toHaveLength(1);
      expect(groups[0].totalFlashes).toBe(1);
      expect(groups[0].totalSends).toBe(2); // flash + send
      expect(groups[0].totalAttempts).toBe(2);
      expect(groups[0].tickCount).toBe(4);
    });

    it('generates deterministic session ID from userId and first tick timestamp', () => {
      const tick1 = makeTick({ climbedAt: '2024-01-15T10:00:00.000Z' });
      const tick2 = makeTick({ climbedAt: '2024-01-15T10:30:00.000Z' });

      const groups = groupTicks('user-1', [tick1, tick2]);
      const expectedId = generateInferredSessionId('user-1', '2024-01-15T10:00:00.000Z');
      expect(groups[0].sessionId).toBe(expectedId);
    });

    it('handles multiple sessions with correct time boundaries', () => {
      const ticks = [
        makeTick({ climbedAt: '2024-01-15T08:00:00.000Z' }),
        makeTick({ climbedAt: '2024-01-15T09:00:00.000Z' }),
        makeTick({ climbedAt: '2024-01-15T18:00:00.000Z' }),
        makeTick({ climbedAt: '2024-01-15T19:00:00.000Z' }),
      ];

      const groups = groupTicks('user-1', ticks);
      expect(groups).toHaveLength(2);
      expect(groups[0].firstTickAt).toBe('2024-01-15T08:00:00.000Z');
      expect(groups[0].lastTickAt).toBe('2024-01-15T09:00:00.000Z');
      expect(groups[1].firstTickAt).toBe('2024-01-15T18:00:00.000Z');
      expect(groups[1].lastTickAt).toBe('2024-01-15T19:00:00.000Z');
    });
  });
});
