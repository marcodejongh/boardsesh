import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ConnectionContext } from '@boardsesh/shared-schema';

// Mock the database client before importing the module under test
vi.mock('../db/client', () => {
  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue({ rows: [] }),
  };
  return { db: mockDb };
});

vi.mock('../graphql/resolvers/social/session-feed', () => ({
  sessionFeedQueries: {
    sessionDetail: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('../jobs/inferred-session-builder', () => ({
  assignInferredSession: vi.fn().mockResolvedValue('new-session-id'),
}));

import { sessionEditMutations } from '../graphql/resolvers/social/session-mutations';
import { db } from '../db/client';

// Helper to create an authenticated context
function makeCtx(userId = 'user-1'): ConnectionContext {
  return {
    isAuthenticated: true,
    userId,
  } as ConnectionContext;
}

// Helper to create an unauthenticated context
function makeUnauthCtx(): ConnectionContext {
  return {
    isAuthenticated: false,
    userId: null,
  } as ConnectionContext;
}

describe('Session Mutation Resolvers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateInferredSession', () => {
    it('rejects unauthenticated users', async () => {
      await expect(
        sessionEditMutations.updateInferredSession(
          null,
          { input: { sessionId: 'session-1', name: 'Test' } },
          makeUnauthCtx(),
        ),
      ).rejects.toThrow('Authentication required');
    });

    it('rejects empty sessionId via validation', async () => {
      await expect(
        sessionEditMutations.updateInferredSession(
          null,
          { input: { sessionId: '', name: 'Test' } },
          makeCtx(),
        ),
      ).rejects.toThrow();
    });
  });

  describe('addUserToSession', () => {
    it('rejects unauthenticated users', async () => {
      await expect(
        sessionEditMutations.addUserToSession(
          null,
          { input: { sessionId: 'session-1', userId: 'user-2' } },
          makeUnauthCtx(),
        ),
      ).rejects.toThrow('Authentication required');
    });

    it('rejects empty userId via validation', async () => {
      await expect(
        sessionEditMutations.addUserToSession(
          null,
          { input: { sessionId: 'session-1', userId: '' } },
          makeCtx(),
        ),
      ).rejects.toThrow();
    });

    it('rejects when session not found (requireSessionParticipant)', async () => {
      // Mock db.select().from().where().limit() to return [] (no session)
      const mockLimit = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

      await expect(
        sessionEditMutations.addUserToSession(
          null,
          { input: { sessionId: 'nonexistent', userId: 'user-2' } },
          makeCtx(),
        ),
      ).rejects.toThrow('Session not found');
    });

    it('rejects non-participant user', async () => {
      // First call: session lookup returns a session owned by different user
      // Second call: override lookup returns empty
      let callCount = 0;
      const mockLimit = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve([{ userId: 'other-owner' }]);
        return Promise.resolve([]);
      });
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

      await expect(
        sessionEditMutations.addUserToSession(
          null,
          { input: { sessionId: 'session-1', userId: 'user-2' } },
          makeCtx('not-a-participant'),
        ),
      ).rejects.toThrow('Not a participant of this session');
    });

    it('rejects when target user has no overlapping ticks', async () => {
      // Call 1: session lookup (owner matches)
      // Call 2: target user lookup
      // Call 3: session time boundaries
      // Then tick query returns empty
      let selectCallCount = 0;
      const mockLimit = vi.fn().mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) return Promise.resolve([{ userId: 'user-1' }]);
        if (selectCallCount === 2) return Promise.resolve([{ id: 'user-2' }]);
        if (selectCallCount === 3) return Promise.resolve([{
          firstTickAt: '2024-01-15T10:00:00.000Z',
          lastTickAt: '2024-01-15T12:00:00.000Z',
        }]);
        return Promise.resolve([]);
      });
      const mockWhere = vi.fn().mockImplementation(() => {
        // For the tick query (4th call), no .limit() — returns directly
        if (selectCallCount >= 3) return Promise.resolve([]);
        return { limit: mockLimit };
      });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

      await expect(
        sessionEditMutations.addUserToSession(
          null,
          { input: { sessionId: 'session-1', userId: 'user-2' } },
          makeCtx('user-1'),
        ),
      ).rejects.toThrow('No ticks found for this user in the session time range');
    });
  });

  describe('removeUserFromSession', () => {
    it('rejects unauthenticated users', async () => {
      await expect(
        sessionEditMutations.removeUserFromSession(
          null,
          { input: { sessionId: 'session-1', userId: 'user-2' } },
          makeUnauthCtx(),
        ),
      ).rejects.toThrow('Authentication required');
    });

    it('rejects when session not found', async () => {
      const mockLimit = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

      await expect(
        sessionEditMutations.removeUserFromSession(
          null,
          { input: { sessionId: 'nonexistent', userId: 'user-2' } },
          makeCtx(),
        ),
      ).rejects.toThrow('Session not found');
    });

    it('rejects removing the session owner', async () => {
      // Call 1: requireSessionParticipant — session found, user is owner
      // Call 2: owner check — same session
      let selectCallCount = 0;
      const mockLimit = vi.fn().mockImplementation(() => {
        selectCallCount++;
        // Both calls return the same session with owner = 'owner-user'
        return Promise.resolve([{ userId: 'owner-user' }]);
      });
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

      await expect(
        sessionEditMutations.removeUserFromSession(
          null,
          { input: { sessionId: 'session-1', userId: 'owner-user' } },
          makeCtx('owner-user'),
        ),
      ).rejects.toThrow('Cannot remove the session owner');
    });
  });
});
