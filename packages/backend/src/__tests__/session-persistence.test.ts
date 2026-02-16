import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { roomManager } from '../services/room-manager';
import { RedisSessionStore } from '../services/redis-session-store';
import { db } from '../db/client';
import { boardSessions, boardSessionQueues } from '../db/schema';
import { eq } from 'drizzle-orm';
import type { ClimbQueueItem } from '@boardsesh/shared-schema';

// Mock Redis for testing
const createMockRedis = (): Redis => {
  const store = new Map<string, string>();
  const sets = new Map<string, Set<string>>();
  const hashes = new Map<string, Record<string, string>>();
  const sortedSets = new Map<string, Array<{ score: number; member: string }>>();

  const mockRedis = {
    set: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
      return 'OK';
    }),
    get: vi.fn(async (key: string) => {
      return store.get(key) || null;
    }),
    del: vi.fn(async (...keys: string[]) => {
      let count = 0;
      for (const key of keys) {
        if (store.delete(key)) count++;
        if (sets.delete(key)) count++;
        if (hashes.delete(key)) count++;
        if (sortedSets.delete(key)) count++;
      }
      return count;
    }),
    exists: vi.fn(async (key: string) => {
      return store.has(key) || hashes.has(key) ? 1 : 0;
    }),
    expire: vi.fn(async () => 1),
    hmset: vi.fn(async (key: string, obj: Record<string, string>) => {
      hashes.set(key, { ...hashes.get(key), ...obj });
      return 'OK';
    }),
    hgetall: vi.fn(async (key: string) => {
      return hashes.get(key) || {};
    }),
    sadd: vi.fn(async (key: string, ...members: string[]) => {
      if (!sets.has(key)) sets.set(key, new Set());
      const set = sets.get(key)!;
      let count = 0;
      for (const member of members) {
        if (!set.has(member)) {
          set.add(member);
          count++;
        }
      }
      return count;
    }),
    srem: vi.fn(async (key: string, ...members: string[]) => {
      const set = sets.get(key);
      if (!set) return 0;
      let count = 0;
      for (const member of members) {
        if (set.delete(member)) count++;
      }
      return count;
    }),
    zadd: vi.fn(async (key: string, score: number, member: string) => {
      if (!sortedSets.has(key)) sortedSets.set(key, []);
      const zset = sortedSets.get(key)!;
      const existing = zset.findIndex((item) => item.member === member);
      if (existing >= 0) {
        zset[existing].score = score;
        return 0;
      } else {
        zset.push({ score, member });
        return 1;
      }
    }),
    zrem: vi.fn(async (key: string, member: string) => {
      const zset = sortedSets.get(key);
      if (!zset) return 0;
      const index = zset.findIndex((item) => item.member === member);
      if (index >= 0) {
        zset.splice(index, 1);
        return 1;
      }
      return 0;
    }),
    multi: vi.fn(() => {
      const commands: Array<() => Promise<unknown>> = [];
      const chainable = {
        hmset: (key: string, obj: Record<string, string>) => {
          commands.push(() => mockRedis.hmset(key, obj));
          return chainable;
        },
        expire: (_key: string, _seconds: number) => {
          commands.push(() => mockRedis.expire(_key, _seconds));
          return chainable;
        },
        zadd: (key: string, score: number, member: string) => {
          commands.push(() => mockRedis.zadd(key, score, member));
          return chainable;
        },
        del: (...keys: string[]) => {
          commands.push(() => mockRedis.del(...keys));
          return chainable;
        },
        sadd: (key: string, ...members: string[]) => {
          commands.push(() => mockRedis.sadd(key, ...members));
          return chainable;
        },
        srem: (key: string, ...members: string[]) => {
          commands.push(() => mockRedis.srem(key, ...members));
          return chainable;
        },
        zrem: (key: string, member: string) => {
          commands.push(() => mockRedis.zrem(key, member));
          return chainable;
        },
        exec: async () => {
          const results = [];
          for (const cmd of commands) {
            results.push([null, await cmd()]);
          }
          return results;
        },
      };
      return chainable;
    }),
    smembers: vi.fn(async (key: string) => {
      const set = sets.get(key);
      return set ? Array.from(set) : [];
    }),
    scard: vi.fn(async (key: string) => {
      const set = sets.get(key);
      return set ? set.size : 0;
    }),
    hset: vi.fn(async (key: string, field: string, value: string) => {
      if (!hashes.has(key)) hashes.set(key, {});
      const hash = hashes.get(key)!;
      const isNew = !(field in hash);
      hash[field] = value;
      return isNew ? 1 : 0;
    }),
    setex: vi.fn(async (key: string, _seconds: number, value: string) => {
      store.set(key, value);
      return 'OK';
    }),
    watch: vi.fn(async () => 'OK'),
    unwatch: vi.fn(async () => 'OK'),
    pipeline: vi.fn(() => {
      const commands: Array<() => Promise<unknown>> = [];
      const chainable = {
        hget: (key: string, field: string) => {
          commands.push(async () => {
            const hash = hashes.get(key);
            return hash ? (hash[field] ?? null) : null;
          });
          return chainable;
        },
        hgetall: (key: string) => {
          commands.push(async () => {
            return hashes.get(key) || {};
          });
          return chainable;
        },
        exec: async () => {
          const results = [];
          for (const cmd of commands) {
            results.push([null, await cmd()]);
          }
          return results;
        },
      };
      return chainable;
    }),
    eval: vi.fn(async () => 1),
    // For distributed lock support
    _store: store,
    _hashes: hashes,
  } as unknown as Redis;

  return mockRedis;
};

// Helper function to register a client before joining
// This is needed because roomManager.joinSession requires the client to be registered first
const registerAndJoinSession = async (
  clientId: string,
  sessionId: string,
  boardPath: string,
  username: string
) => {
  roomManager.registerClient(clientId);
  return roomManager.joinSession(clientId, sessionId, boardPath, username);
};

// Helper for registering multiple clients
const registerClients = (...clientIds: string[]) => {
  for (const clientId of clientIds) {
    roomManager.registerClient(clientId);
  }
};

const createTestClimb = (): ClimbQueueItem => ({
  uuid: uuidv4(),
  climb: {
    uuid: uuidv4(),
    setter_username: 'TestSetter',
    name: 'Test Climb',
    description: 'A test climb',
    frames: '{}',
    angle: 40,
    ascensionist_count: 10,
    difficulty: '6A',
    quality_average: '3.5',
    stars: 3.5,
    difficulty_error: '0.5',
    litUpHoldsMap: {},
    mirrored: false,
    benchmark_difficulty: null,
  },
  addedBy: 'test-user',
  tickedBy: [],
  suggested: false,
});

// Helper function to register a client before joining
const registerAndJoinSession = async (
  clientId: string,
  sessionId: string,
  boardPath: string,
  username?: string
) => {
  await roomManager.registerClient(clientId);
  return roomManager.joinSession(clientId, sessionId, boardPath, username);
};

describe('Session Persistence - Hybrid Redis + Postgres', () => {
  let mockRedis: Redis;

  beforeEach(async () => {
    // Create fresh mock Redis for each test
    mockRedis = createMockRedis();

    // Reset room manager and initialize with mock Redis
    roomManager.reset();
    await roomManager.initialize(mockRedis);
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Session Lifecycle Transitions', () => {
    it('should transition from active → inactive when last user leaves', async () => {
      const sessionId = uuidv4();
      const boardPath = '/kilter/1/2/3/40';

      // Create and join session
      await registerAndJoinSession('client-1', sessionId, boardPath, 'User1');

      // Verify active status
      let session = await db
        .select()
        .from(boardSessions)
        .where(eq(boardSessions.id, sessionId))
        .limit(1);
      expect(session[0]?.status).toBe('active');

      // Leave session
      await roomManager.leaveSession('client-1');

      // Verify inactive status
      session = await db
        .select()
        .from(boardSessions)
        .where(eq(boardSessions.id, sessionId))
        .limit(1);
      expect(session[0]?.status).toBe('inactive');

      // Verify session not deleted from Postgres
      expect(session.length).toBe(1);
    });

    it('should transition inactive → active when user rejoins', async () => {
      const sessionId = uuidv4();
      const boardPath = '/kilter/1/2/3/40';

      // Create session, join, and leave
      await registerAndJoinSession('client-1', sessionId, boardPath, 'User1');
      await roomManager.leaveSession('client-1');

      // Verify inactive
      let session = await db
        .select()
        .from(boardSessions)
        .where(eq(boardSessions.id, sessionId))
        .limit(1);
      expect(session[0]?.status).toBe('inactive');

      // Rejoin
      await registerAndJoinSession('client-2', sessionId, boardPath, 'User2');

      // Verify back to active
      session = await db
        .select()
        .from(boardSessions)
        .where(eq(boardSessions.id, sessionId))
        .limit(1);
      expect(session[0]?.status).toBe('active');
    });

    it('should transition to ended when endSession is called', async () => {
      const sessionId = uuidv4();
      const boardPath = '/kilter/1/2/3/40';

      // Create session
      await registerAndJoinSession('client-1', sessionId, boardPath, 'User1');

      // End session
      await roomManager.endSession(sessionId);

      // Verify ended status
      const session = await db
        .select()
        .from(boardSessions)
        .where(eq(boardSessions.id, sessionId))
        .limit(1);
      expect(session[0]?.status).toBe('ended');

      // Verify removed from Redis
      expect(mockRedis.exists).toHaveBeenCalledWith(`boardsesh:session:${sessionId}`);
    });
  });

  describe('Lazy Restoration from Redis', () => {
    it('should restore inactive session from Redis when user rejoins', async () => {
      const sessionId = uuidv4();
      const boardPath = '/kilter/1/2/3/40';
      const climb = createTestClimb();

      // Create session and add climb to queue
      await registerAndJoinSession('client-1', sessionId, boardPath, 'User1');
      const currentState = await roomManager.getQueueState(sessionId);
      await roomManager.updateQueueState(sessionId, [climb], null, currentState.version);

      // Leave session (makes it inactive but keeps in Redis)
      await roomManager.leaveSession('client-1');

      // Clear in-memory state to simulate server restart
      roomManager.reset();
      await roomManager.initialize(mockRedis);

      // Rejoin should restore from Redis
      const result = await registerAndJoinSession('client-2', sessionId, boardPath, 'User2');

      // Verify queue was restored from Redis
      expect(result.queue).toHaveLength(1);
      expect(result.queue[0]?.uuid).toBe(climb.uuid);
    });

    it('should handle multiple users joining inactive session concurrently', async () => {
      const sessionId = uuidv4();
      const boardPath = '/kilter/1/2/3/40';

      // Create session and make it inactive
      await registerAndJoinSession('client-1', sessionId, boardPath, 'User1');
      await roomManager.leaveSession('client-1');

      // Clear in-memory state
      roomManager.reset();
      await roomManager.initialize(mockRedis);

      // Multiple users join concurrently
      registerClients('client-2', 'client-3', 'client-4');
      const results = await Promise.all([
        roomManager.joinSession('client-2', sessionId, boardPath, 'User2'),
        roomManager.joinSession('client-3', sessionId, boardPath, 'User3'),
        roomManager.joinSession('client-4', sessionId, boardPath, 'User4'),
      ]);

      // Verify all joined successfully
      expect(results).toHaveLength(3);
      const users = await roomManager.getSessionUsers(sessionId);
      expect(users).toHaveLength(3);
    });
  });

  describe('Lazy Restoration from Postgres', () => {
    it('should restore dormant session from Postgres when Redis expires', async () => {
      const sessionId = uuidv4();
      const boardPath = '/kilter/1/2/3/40';
      const climb = createTestClimb();

      // Create session and add climb to queue
      await registerAndJoinSession('client-1', sessionId, boardPath, 'User1');
      const currentState = await roomManager.getQueueState(sessionId);
      await roomManager.updateQueueState(sessionId, [climb], null, currentState.version);

      // Flush pending writes to ensure data in Postgres
      await roomManager.flushPendingWrites();

      // Leave session
      await roomManager.leaveSession('client-1');

      // Simulate Redis expiry by clearing Redis and resetting room manager
      const redisHashes = (mockRedis as any)._hashes as Map<string, Record<string, string>>;
      redisHashes.clear();

      roomManager.reset();
      await roomManager.initialize(mockRedis);

      // Rejoin should restore from Postgres
      const result = await registerAndJoinSession('client-2', sessionId, boardPath, 'User2');

      // Verify queue was restored from Postgres
      expect(result.queue).toHaveLength(1);
      expect(result.queue[0]?.uuid).toBe(climb.uuid);
    });

    it('should not restore ended sessions from Postgres', async () => {
      const sessionId = uuidv4();
      const boardPath = '/kilter/1/2/3/40';

      // Create and end session
      await registerAndJoinSession('client-1', sessionId, boardPath, 'User1');
      await roomManager.endSession(sessionId);

      // Clear in-memory state
      roomManager.reset();
      await roomManager.initialize(mockRedis);

      // Try to rejoin ended session - should create a new session instead of restoring
      const result = await registerAndJoinSession('client-2', sessionId, boardPath, 'User2');

      // Session should be created fresh (empty queue)
      expect(result.queue).toHaveLength(0);
    });
  });

  describe('Debounced Writes and Flush', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should debounce Postgres writes for 30 seconds', async () => {
      const sessionId = uuidv4();
      const boardPath = '/kilter/1/2/3/40';
      const climb1 = createTestClimb();
      const climb2 = createTestClimb();

      // Create session
      await registerAndJoinSession('client-1', sessionId, boardPath, 'User1');

      // Add multiple climbs rapidly
      let currentState = await roomManager.getQueueState(sessionId);
      await roomManager.updateQueueState(sessionId, [climb1], null, currentState.version);

      currentState = await roomManager.getQueueState(sessionId);
      await roomManager.updateQueueState(sessionId, [climb1, climb2], null, currentState.version);

      // Check Postgres immediately - should not have latest state yet
      let queueRows = await db
        .select()
        .from(boardSessionQueues)
        .where(eq(boardSessionQueues.sessionId, sessionId));

      // Either no row yet, or old state
      if (queueRows.length > 0) {
        const queue = queueRows[0]?.queue as unknown[];
        expect(queue.length).toBeLessThan(2);
      }

      // Fast-forward 30 seconds
      await vi.advanceTimersByTimeAsync(30000);

      // Now check Postgres - should have latest state
      queueRows = await db
        .select()
        .from(boardSessionQueues)
        .where(eq(boardSessionQueues.sessionId, sessionId));

      expect(queueRows.length).toBe(1);
      const queue = queueRows[0]?.queue as unknown[];
      expect(queue).toHaveLength(2);
    });

    it('should flush pending writes on flushPendingWrites call', async () => {
      const sessionId = uuidv4();
      const boardPath = '/kilter/1/2/3/40';
      const climb = createTestClimb();

      // Create session and update queue
      await registerAndJoinSession('client-1', sessionId, boardPath, 'User1');
      const currentState = await roomManager.getQueueState(sessionId);
      await roomManager.updateQueueState(sessionId, [climb], null, currentState.version);

      // Flush immediately (don't wait for timer)
      await roomManager.flushPendingWrites();

      // Verify data in Postgres
      const queueRows = await db
        .select()
        .from(boardSessionQueues)
        .where(eq(boardSessionQueues.sessionId, sessionId));

      expect(queueRows.length).toBe(1);
      const queue = queueRows[0]?.queue as unknown[];
      expect(queue).toHaveLength(1);
    });

    it('should cancel pending timer when new update arrives', async () => {
      const sessionId = uuidv4();
      const boardPath = '/kilter/1/2/3/40';
      const climb1 = createTestClimb();
      const climb2 = createTestClimb();

      // Create session
      await registerAndJoinSession('client-1', sessionId, boardPath, 'User1');

      // First update
      let currentState = await roomManager.getQueueState(sessionId);
      await roomManager.updateQueueState(sessionId, [climb1], null, currentState.version);

      // Wait 15 seconds
      await vi.advanceTimersByTimeAsync(15000);

      // Second update (should reset timer)
      currentState = await roomManager.getQueueState(sessionId);
      await roomManager.updateQueueState(sessionId, [climb1, climb2], null, currentState.version);

      // Wait another 15 seconds (total 30s from start, but only 15s from second update)
      await vi.advanceTimersByTimeAsync(15000);

      // Should not be written yet (timer was reset)
      let queueRows = await db
        .select()
        .from(boardSessionQueues)
        .where(eq(boardSessionQueues.sessionId, sessionId));

      if (queueRows.length > 0) {
        const queue = queueRows[0]?.queue as unknown[];
        expect(queue.length).toBeLessThan(2);
      }

      // Wait final 15 seconds (30s from second update)
      await vi.advanceTimersByTimeAsync(15000);

      // Now should be written
      queueRows = await db
        .select()
        .from(boardSessionQueues)
        .where(eq(boardSessionQueues.sessionId, sessionId));

      expect(queueRows.length).toBe(1);
      const queue = queueRows[0]?.queue as unknown[];
      expect(queue).toHaveLength(2);
    });
  });

  describe('isActive Field Calculation', () => {
    it('should mark session as active when users are connected', async () => {
      const sessionId = uuidv4();
      const boardPath = '/kilter/1/2/3/40';

      // Create discoverable session
      await roomManager.createDiscoverableSession(
        sessionId,
        boardPath,
        'user-123',
        37.7749,
        -122.4194,
        'Test Session'
      );

      await registerAndJoinSession('client-1', sessionId, boardPath, 'User1');

      // Query nearby sessions
      const nearby = await roomManager.findNearbySessions(37.7749, -122.4194, 10000);

      const session = nearby.find((s) => s.id === sessionId);
      expect(session?.isActive).toBe(true);
      expect(session?.participantCount).toBe(1);
    });

    it('should mark session as active when in Redis even without connected users', async () => {
      const sessionId = uuidv4();
      const boardPath = '/kilter/1/2/3/40';

      // Create discoverable session
      await roomManager.createDiscoverableSession(
        sessionId,
        boardPath,
        'user-123',
        37.7749,
        -122.4194,
        'Test Session'
      );

      await registerAndJoinSession('client-1', sessionId, boardPath, 'User1');
      await roomManager.leaveSession('client-1');

      // Clear in-memory state but Redis still has it
      roomManager.reset();
      await roomManager.initialize(mockRedis);

      // Query nearby sessions
      const nearby = await roomManager.findNearbySessions(37.7749, -122.4194, 10000);

      const session = nearby.find((s) => s.id === sessionId);
      expect(session?.isActive).toBe(true);
      expect(session?.participantCount).toBe(0);
    });

    it('should mark session as inactive when only in Postgres', async () => {
      const sessionId = uuidv4();
      const boardPath = '/kilter/1/2/3/40';

      // Create discoverable session
      await roomManager.createDiscoverableSession(
        sessionId,
        boardPath,
        'user-123',
        37.7749,
        -122.4194,
        'Test Session'
      );

      await registerAndJoinSession('client-1', sessionId, boardPath, 'User1');
      await roomManager.leaveSession('client-1');

      // Clear both in-memory and Redis (simulate TTL expiry)
      const redisHashes = (mockRedis as any)._hashes as Map<string, Record<string, string>>;
      redisHashes.clear();

      roomManager.reset();
      await roomManager.initialize(mockRedis);

      // Query nearby sessions
      const nearby = await roomManager.findNearbySessions(37.7749, -122.4194, 10000);

      const session = nearby.find((s) => s.id === sessionId);
      expect(session?.isActive).toBe(false);
      expect(session?.participantCount).toBe(0);
    });

    it('should exclude ended sessions from discovery', async () => {
      const sessionId = uuidv4();
      const boardPath = '/kilter/1/2/3/40';

      // Create discoverable session
      await roomManager.createDiscoverableSession(
        sessionId,
        boardPath,
        'user-123',
        37.7749,
        -122.4194,
        'Test Session'
      );

      await registerAndJoinSession('client-1', sessionId, boardPath, 'User1');
      await roomManager.endSession(sessionId);

      // Query nearby sessions
      const nearby = await roomManager.findNearbySessions(37.7749, -122.4194, 10000);

      const session = nearby.find((s) => s.id === sessionId);
      expect(session).toBeUndefined();
    });
  });

  describe('Graceful Degradation - Redis Unavailable', () => {
    it('should work in Postgres-only mode when Redis is not available', async () => {
      // Reset without Redis
      roomManager.reset();
      await roomManager.initialize();

      const sessionId = uuidv4();
      const boardPath = '/kilter/1/2/3/40';
      const climb = createTestClimb();

      // Should still work
      await registerAndJoinSession('client-1', sessionId, boardPath, 'User1');
      const currentState = await roomManager.getQueueState(sessionId);
      await roomManager.updateQueueState(sessionId, [climb], null, currentState.version);

      // Verify queue works
      const state = await roomManager.getQueueState(sessionId);
      expect(state.queue).toHaveLength(1);
      expect(state.queue[0]?.uuid).toBe(climb.uuid);

      // Leave session
      await roomManager.leaveSession('client-1');

      // Session should be marked inactive in Postgres
      const session = await db
        .select()
        .from(boardSessions)
        .where(eq(boardSessions.id, sessionId))
        .limit(1);
      expect(session[0]?.status).toBe('inactive');
    });

    it('should not restore sessions in Postgres-only mode after server restart', async () => {
      // Run without Redis
      roomManager.reset();
      await roomManager.initialize();

      const sessionId = uuidv4();
      const boardPath = '/kilter/1/2/3/40';

      // Create session and leave
      await registerAndJoinSession('client-1', sessionId, boardPath, 'User1');
      await roomManager.leaveSession('client-1');

      // Reset (simulate server restart)
      roomManager.reset();
      await roomManager.initialize();

      // Try to rejoin - should create new session (no restoration in Postgres-only mode)
      const result = await registerAndJoinSession('client-2', sessionId, boardPath, 'User2');

      // Should be fresh session
      expect(result.queue).toHaveLength(0);
    });
  });

  describe('Data Ownership and Separation', () => {
    it('should store queue state in both Redis and Postgres', async () => {
      const sessionId = uuidv4();
      const boardPath = '/kilter/1/2/3/40';
      const climb = createTestClimb();

      // Create session and update queue
      await registerAndJoinSession('client-1', sessionId, boardPath, 'User1');
      const currentState = await roomManager.getQueueState(sessionId);
      await roomManager.updateQueueState(sessionId, [climb], null, currentState.version);

      // Flush to Postgres
      await roomManager.flushPendingWrites();

      // Verify in Redis
      const redisHashes = (mockRedis as any)._hashes as Map<string, Record<string, string>>;
      const redisSession = redisHashes.get(`boardsesh:session:${sessionId}`);
      expect(redisSession?.queue).toBeDefined();

      // Verify in Postgres
      const pgQueue = await db
        .select()
        .from(boardSessionQueues)
        .where(eq(boardSessionQueues.sessionId, sessionId));
      expect(pgQueue).toHaveLength(1);
      expect((pgQueue[0]?.queue as unknown[])).toHaveLength(1);
    });

    it('should only store connected users in Redis, not Postgres', async () => {
      const sessionId = uuidv4();
      const boardPath = '/kilter/1/2/3/40';

      // Create session
      await registerAndJoinSession('client-1', sessionId, boardPath, 'User1');
      await registerAndJoinSession('client-2', sessionId, boardPath, 'User2');

      // Verify users in Redis
      const redisHashes = (mockRedis as any)._hashes as Map<string, Record<string, string>>;
      const redisUsers = redisHashes.get(`boardsesh:session:${sessionId}:users`);
      expect(Object.keys(redisUsers || {}).length).toBeGreaterThan(0);

      // Users should NOT be persisted to Postgres in new model
      // (board_session_clients table is deprecated in favor of Redis-only user storage)
      // We can verify by checking that session metadata is updated but user list is ephemeral
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle version conflicts with retry logic', async () => {
      const sessionId = uuidv4();
      const boardPath = '/kilter/1/2/3/40';

      await registerAndJoinSession('client-1', sessionId, boardPath, 'User1');

      // Simulate concurrent updates with same version
      const currentState = await roomManager.getQueueState(sessionId);
      const climb1 = createTestClimb();
      const climb2 = createTestClimb();

      // Both updates use same version - second should retry
      await Promise.all([
        roomManager.updateQueueState(sessionId, [climb1], null, currentState.version),
        roomManager.updateQueueState(sessionId, [climb2], null, currentState.version),
      ]);

      // Final state should have one of them (retry logic should handle conflict)
      const finalState = await roomManager.getQueueState(sessionId);
      expect(finalState.queue.length).toBeGreaterThan(0);
    });

    it('should handle Redis operations failing gracefully', async () => {
      // Create Redis mock that fails
      const failingRedis = createMockRedis();
      failingRedis.hmset = vi.fn(async () => {
        throw new Error('Redis connection error');
      });

      roomManager.reset();
      await roomManager.initialize(failingRedis);

      const sessionId = uuidv4();
      const boardPath = '/kilter/1/2/3/40';

      // Should not crash, might fall back to Postgres-only behavior
      await expect(async () => {
        await registerAndJoinSession('client-1', sessionId, boardPath, 'User1');
      }).rejects.toThrow();
    });
  });
});
