import { describe, it, expect } from 'vitest';
import {
  groupTicksIntoSessions,
  generateInferredSessionId,
  type TickForGrouping,
} from '../jobs/inferred-session-builder';

function makeTick(overrides: Partial<TickForGrouping> & { userId: string; climbedAt: string }): TickForGrouping {
  return {
    id: BigInt(Math.floor(Math.random() * 100000)),
    uuid: `tick-${Math.random().toString(36).slice(2)}`,
    status: 'send',
    sessionId: null,
    inferredSessionId: null,
    ...overrides,
  };
}

describe('Inferred Session Builder', () => {
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
  });

  describe('groupTicksIntoSessions', () => {
    it('groups ticks within 4-hour gap into one session', () => {
      const ticks = [
        makeTick({ userId: 'user-1', climbedAt: '2024-01-15T10:00:00.000Z' }),
        makeTick({ userId: 'user-1', climbedAt: '2024-01-15T10:30:00.000Z' }),
        makeTick({ userId: 'user-1', climbedAt: '2024-01-15T11:00:00.000Z' }),
      ];

      const groups = groupTicksIntoSessions(ticks);
      expect(groups).toHaveLength(1);
      expect(groups[0].tickUuids).toHaveLength(3);
    });

    it('splits into two sessions when gap exceeds 4 hours', () => {
      const ticks = [
        makeTick({ userId: 'user-1', climbedAt: '2024-01-15T10:00:00.000Z' }),
        makeTick({ userId: 'user-1', climbedAt: '2024-01-15T10:30:00.000Z' }),
        makeTick({ userId: 'user-1', climbedAt: '2024-01-15T11:00:00.000Z' }),
        makeTick({ userId: 'user-1', climbedAt: '2024-01-15T18:00:00.000Z' }),
        makeTick({ userId: 'user-1', climbedAt: '2024-01-15T18:30:00.000Z' }),
      ];

      const groups = groupTicksIntoSessions(ticks);
      expect(groups).toHaveLength(2);
      expect(groups[0].tickUuids).toHaveLength(3);
      expect(groups[1].tickUuids).toHaveLength(2);
    });

    it('creates single-tick session for a lone tick', () => {
      const ticks = [
        makeTick({ userId: 'user-1', climbedAt: '2024-01-15T10:00:00.000Z' }),
      ];

      const groups = groupTicksIntoSessions(ticks);
      expect(groups).toHaveLength(1);
      expect(groups[0].tickCount).toBe(1);
    });

    it('groups cross-board ticks in the same session', () => {
      const ticks = [
        makeTick({ userId: 'user-1', climbedAt: '2024-01-15T10:00:00.000Z' }),
        makeTick({ userId: 'user-1', climbedAt: '2024-01-15T10:30:00.000Z' }),
      ];

      const groups = groupTicksIntoSessions(ticks);
      expect(groups).toHaveLength(1);
    });

    it('skips ticks with existing sessionId', () => {
      const ticks = [
        makeTick({ userId: 'user-1', climbedAt: '2024-01-15T10:00:00.000Z', sessionId: 'party-1' }),
        makeTick({ userId: 'user-1', climbedAt: '2024-01-15T10:30:00.000Z' }),
      ];

      const groups = groupTicksIntoSessions(ticks);
      expect(groups).toHaveLength(1);
      expect(groups[0].tickUuids).toHaveLength(1);
    });

    it('skips ticks with existing inferredSessionId', () => {
      const ticks = [
        makeTick({ userId: 'user-1', climbedAt: '2024-01-15T10:00:00.000Z', inferredSessionId: 'inferred-1' }),
        makeTick({ userId: 'user-1', climbedAt: '2024-01-15T10:30:00.000Z' }),
      ];

      const groups = groupTicksIntoSessions(ticks);
      expect(groups).toHaveLength(1);
      expect(groups[0].tickUuids).toHaveLength(1);
    });

    it('ticks exactly at 4-hour boundary start a new session', () => {
      const ticks = [
        makeTick({ userId: 'user-1', climbedAt: '2024-01-15T10:00:00.000Z' }),
        // Exactly 4h + 1ms later
        makeTick({ userId: 'user-1', climbedAt: '2024-01-15T14:00:00.001Z' }),
      ];

      const groups = groupTicksIntoSessions(ticks);
      expect(groups).toHaveLength(2);
    });

    it('returns empty array for empty input', () => {
      const groups = groupTicksIntoSessions([]);
      expect(groups).toHaveLength(0);
    });

    it('isolates sessions per user', () => {
      const ticks = [
        makeTick({ userId: 'user-1', climbedAt: '2024-01-15T10:00:00.000Z' }),
        makeTick({ userId: 'user-2', climbedAt: '2024-01-15T10:00:00.000Z' }),
        makeTick({ userId: 'user-1', climbedAt: '2024-01-15T10:30:00.000Z' }),
        makeTick({ userId: 'user-2', climbedAt: '2024-01-15T10:30:00.000Z' }),
      ];

      const groups = groupTicksIntoSessions(ticks);
      expect(groups).toHaveLength(2);

      const user1Session = groups.find((g) => g.userId === 'user-1');
      const user2Session = groups.find((g) => g.userId === 'user-2');
      expect(user1Session).toBeDefined();
      expect(user2Session).toBeDefined();
      expect(user1Session!.sessionId).not.toBe(user2Session!.sessionId);
    });

    it('correctly counts sends, flashes, and attempts', () => {
      const ticks = [
        makeTick({ userId: 'user-1', climbedAt: '2024-01-15T10:00:00.000Z', status: 'flash' }),
        makeTick({ userId: 'user-1', climbedAt: '2024-01-15T10:10:00.000Z', status: 'send' }),
        makeTick({ userId: 'user-1', climbedAt: '2024-01-15T10:20:00.000Z', status: 'attempt' }),
        makeTick({ userId: 'user-1', climbedAt: '2024-01-15T10:30:00.000Z', status: 'attempt' }),
      ];

      const groups = groupTicksIntoSessions(ticks);
      expect(groups).toHaveLength(1);
      // flash counts as both flash and send
      expect(groups[0].totalFlashes).toBe(1);
      expect(groups[0].totalSends).toBe(2); // flash + send
      expect(groups[0].totalAttempts).toBe(2);
      expect(groups[0].tickCount).toBe(4);
    });
  });
});
