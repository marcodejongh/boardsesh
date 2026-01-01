import { v4 as uuidv4 } from 'uuid';
import type Redis from 'ioredis';
import { db } from '../db/client.js';
import { sessions, sessionClients, sessionQueues, type Session } from '../db/schema.js';
import { eq, and, sql, gt, gte, lte, ne } from 'drizzle-orm';
import type { ClimbQueueItem, SessionUser } from '@boardsesh/shared-schema';
import { haversineDistance, getBoundingBox, DEFAULT_SEARCH_RADIUS_METERS } from '../utils/geo.js';
import { RedisSessionStore } from './redis-session-store.js';
import { computeQueueStateHash } from '../utils/hash.js';
import {
  DistributedStateManager,
  initializeDistributedState,
  getDistributedState,
  shutdownDistributedState,
} from './distributed-state.js';

// Custom error for version conflicts
export class VersionConflictError extends Error {
  constructor(sessionId: string, expectedVersion: number) {
    super(`Version conflict for session ${sessionId}. Expected version ${expectedVersion} but it was updated by another operation.`);
    this.name = 'VersionConflictError';
  }
}

interface ConnectedClient {
  connectionId: string;
  sessionId: string | null;
  username: string;
  avatarUrl?: string;
  isLeader: boolean;
  connectedAt: Date;
}

export type DiscoverableSession = {
  id: string;
  name: string | null;
  boardPath: string;
  latitude: number;
  longitude: number;
  createdAt: Date;
  createdByUserId: string | null;
  participantCount: number;
  distance: number;
  isActive: boolean;
};

class RoomManager {
  private clients: Map<string, ConnectedClient> = new Map();
  private sessions: Map<string, Set<string>> = new Map();
  private redisStore: RedisSessionStore | null = null;
  private distributedState: DistributedStateManager | null = null;
  private postgresWriteTimers: Map<string, NodeJS.Timeout> = new Map();
  private pendingWrites: Map<string, { queue: ClimbQueueItem[]; currentClimbQueueItem: ClimbQueueItem | null; version: number; sequence: number }> = new Map();
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_BASE_DELAY = 1000; // 1 second
  private writeRetryAttempts: Map<string, number> = new Map();
  private retryTimers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Reset all state (for testing purposes)
   */
  reset(): void {
    this.clients.clear();
    this.sessions.clear();
  }

  /**
   * Initialize RoomManager with Redis for session persistence and distributed state.
   * If Redis is not provided, falls back to Postgres-only mode (single instance).
   */
  async initialize(redis?: Redis): Promise<void> {
    if (redis) {
      this.redisStore = new RedisSessionStore(redis);
      console.log('[RoomManager] Redis session storage enabled');

      // Initialize distributed state for multi-instance support
      this.distributedState = initializeDistributedState(redis);
      this.distributedState.start();
      console.log('[RoomManager] Distributed state enabled for multi-instance support');
    } else {
      console.log('[RoomManager] Redis not available - using Postgres only mode (single instance)');
    }
  }

  /**
   * Shutdown RoomManager and clean up distributed state.
   */
  async shutdown(): Promise<void> {
    await this.flushPendingWrites();
    await shutdownDistributedState();
    console.log('[RoomManager] Shutdown complete');
  }

  /**
   * Check if distributed state is enabled (multi-instance mode).
   */
  isDistributedStateEnabled(): boolean {
    return this.distributedState !== null;
  }

  async registerClient(connectionId: string, username?: string, userId?: string, avatarUrl?: string): Promise<string> {
    const defaultUsername = username || `User-${connectionId.substring(0, 6)}`;
    this.clients.set(connectionId, {
      connectionId,
      sessionId: null,
      username: defaultUsername,
      isLeader: false,
      connectedAt: new Date(),
      avatarUrl,
    });

    // Register in distributed state for cross-instance visibility
    // Await to ensure consistency - if this fails, the client is not properly registered
    // Note: Postgres sessionClients table is only written on joinSession, not here,
    // so rollback only needs to clean up the local map (no Postgres cleanup needed)
    if (this.distributedState) {
      try {
        await this.distributedState.registerConnection(connectionId, defaultUsername, userId, avatarUrl);
      } catch (err) {
        // Remove local client on distributed state failure to maintain consistency
        this.clients.delete(connectionId);
        // Log only the error message, not the full error object which may contain sensitive Redis connection info
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[RoomManager] Failed to register connection in distributed state: ${errorMessage}`);
        throw new Error(`Failed to register client: distributed state error`);
      }
    }

    return connectionId;
  }

  getClient(connectionId: string): ConnectedClient | undefined {
    return this.clients.get(connectionId);
  }

  getClientById(clientId: string): ConnectedClient | undefined {
    return this.clients.get(clientId);
  }

  async joinSession(
    connectionId: string,
    sessionId: string,
    boardPath: string,
    username?: string,
    avatarUrl?: string,
    initialQueue?: ClimbQueueItem[],
    initialCurrentClimb?: ClimbQueueItem | null
  ): Promise<{
    clientId: string;
    users: SessionUser[];
    queue: ClimbQueueItem[];
    currentClimbQueueItem: ClimbQueueItem | null;
    sequence: number;
    stateHash: string;
    isLeader: boolean;
  }> {
    const client = this.clients.get(connectionId);
    if (!client) {
      throw new Error('Client not registered');
    }

    // Leave current session if in one
    if (client.sessionId) {
      await this.leaveSession(connectionId);
    }

    // Update client info
    client.sessionId = sessionId;
    if (username) {
      client.username = username;
    }
    if (avatarUrl) {
      client.avatarUrl = avatarUrl;
    }

    // Track if this is a new session
    let isNewSession = false;

    // Create or get session in memory - with lazy restore
    if (!this.sessions.has(sessionId)) {
      if (this.redisStore) {
        const lockKey = this.getSessionRestoreLockKey(sessionId);
        const lockValue = uuidv4();
        const lockTTL = 10; // 10 seconds

        // Try to acquire lock
        const lockAcquired = await this.redisStore.acquireLock(lockKey, lockValue, lockTTL);

        if (lockAcquired) {
          try {
            // Double-check after acquiring lock (another instance might have initialized)
            if (!this.sessions.has(sessionId)) {
              // Try to restore session from Redis first (hot cache)
              const redisSession = await this.redisStore.getSession(sessionId);
              if (redisSession) {
                console.log(`[RoomManager] Restoring session ${sessionId} from Redis (inactive session)`);
              } else {
                // Not in Redis, try Postgres (dormant session)
                const pgSession = await this.getSessionById(sessionId);
                if (pgSession && pgSession.status !== 'ended') {
                  console.log(`[RoomManager] Restoring session ${sessionId} from Postgres (dormant session)`);
                  const queueState = await this.getQueueState(sessionId);
                  await this.redisStore.saveSession({
                    sessionId: pgSession.id,
                    boardPath: pgSession.boardPath,
                    queue: queueState.queue,
                    currentClimbQueueItem: queueState.currentClimbQueueItem,
                    version: queueState.version,
                    sequence: queueState.sequence,
                    stateHash: queueState.stateHash,
                    lastActivity: pgSession.lastActivity,
                    discoverable: pgSession.discoverable,
                    latitude: pgSession.latitude,
                    longitude: pgSession.longitude,
                    name: pgSession.name,
                    createdByUserId: pgSession.createdByUserId,
                    createdAt: pgSession.createdAt,
                  });
                } else {
                  // Session doesn't exist in Redis or Postgres - this is a new session
                  isNewSession = true;
                  console.log(`[RoomManager] Creating new session ${sessionId} with ${initialQueue?.length || 0} initial queue items`);
                }
              }
              this.sessions.set(sessionId, new Set());
            }
          } finally {
            // Always release lock
            await this.redisStore.releaseLock(lockKey, lockValue);
          }
        } else {
          // Lock not acquired - wait with exponential backoff for restoration to complete
          console.log(`[RoomManager] Lock not acquired for session ${sessionId}, waiting with backoff...`);
          let waitTime = 50;
          const maxWait = 2000;
          const maxAttempts = 5;
          let sessionRestored = false;

          for (let attempt = 0; attempt < maxAttempts; attempt++) {
            await new Promise(resolve => setTimeout(resolve, waitTime));

            // Check if session was restored by another instance
            if (this.sessions.has(sessionId)) {
              console.log(`[RoomManager] Session ${sessionId} restored by another instance after ${attempt + 1} attempts`);
              sessionRestored = true;
              break;
            }

            // Exponential backoff
            waitTime = Math.min(waitTime * 2, maxWait);
          }

          // After waiting, verify session state from Redis to ensure consistency
          if (!sessionRestored && !this.sessions.has(sessionId)) {
            // Check Redis to see if the session was restored by another instance
            const redisSession = await this.redisStore.getSession(sessionId);
            if (redisSession) {
              console.log(`[RoomManager] Session ${sessionId} found in Redis after backoff, using restored state`);
              this.sessions.set(sessionId, new Set());
            } else {
              // Session doesn't exist in Redis - check Postgres as fallback
              const pgSession = await this.getSessionById(sessionId);
              if (pgSession && pgSession.status !== 'ended') {
                console.log(`[RoomManager] Session ${sessionId} found in Postgres after backoff, restoring`);
                const queueState = await this.getQueueState(sessionId);
                await this.redisStore.saveSession({
                  sessionId: pgSession.id,
                  boardPath: pgSession.boardPath,
                  queue: queueState.queue,
                  currentClimbQueueItem: queueState.currentClimbQueueItem,
                  version: queueState.version,
                  sequence: queueState.sequence,
                  stateHash: queueState.stateHash,
                  lastActivity: pgSession.lastActivity,
                  discoverable: pgSession.discoverable,
                  latitude: pgSession.latitude,
                  longitude: pgSession.longitude,
                  name: pgSession.name,
                  createdByUserId: pgSession.createdByUserId,
                  createdAt: pgSession.createdAt,
                });
              } else {
                // This is genuinely a new session
                isNewSession = true;
                console.log(`[RoomManager] Session ${sessionId} not found after backoff, treating as new session`);
              }
              this.sessions.set(sessionId, new Set());
            }
          }
        }
      } else {
        // No Redis, check Postgres directly for session existence
        const pgSession = await this.getSessionById(sessionId);
        if (!pgSession || pgSession.status === 'ended') {
          isNewSession = true;
          console.log(`[RoomManager] Creating new session ${sessionId} with ${initialQueue?.length || 0} initial queue items`);
        }
        this.sessions.set(sessionId, new Set());
      }
    }
    const sessionClientIds = this.sessions.get(sessionId)!;

    // Determine leader status
    let isLeader: boolean;

    if (this.distributedState) {
      // Use distributed state for atomic leader election across instances
      const result = await this.distributedState.joinSession(
        connectionId,
        sessionId,
        client.username,
        client.avatarUrl
      );
      isLeader = result.isLeader;
    } else {
      // Single instance mode: first local client becomes leader
      isLeader = sessionClientIds.size === 0;
    }

    client.isLeader = isLeader;
    sessionClientIds.add(connectionId);

    // Persist to database (update session metadata, not user list)
    await this.persistSessionJoin(sessionId, boardPath, connectionId, client.username, isLeader);

    // Update Postgres session status to 'active' and lastActivity
    await db
      .update(sessions)
      .set({ status: 'active', lastActivity: new Date() })
      .where(eq(sessions.id, sessionId));

    // Initialize queue state for new sessions with provided initial queue
    if (isNewSession && initialQueue && initialQueue.length > 0) {
      console.log(`[RoomManager] Initializing queue for new session ${sessionId} with ${initialQueue.length} items`);
      await this.updateQueueStateImmediate(
        sessionId,
        initialQueue,
        initialCurrentClimb || null,
        0 // Version 0 for new session
      );
    }

    // Update Redis session state
    if (this.redisStore) {
      await this.redisStore.markActive(sessionId);
      await this.redisStore.refreshTTL(sessionId);

      // Only save users to Redis store if NOT using distributed state
      // (distributed state handles user list separately)
      if (!this.distributedState) {
        const users = this.getSessionUsersLocal(sessionId);
        await this.redisStore.saveUsers(sessionId, users);
      }
    }

    // Get current session state
    const users = await this.getSessionUsers(sessionId);
    const queueState = await this.getQueueState(sessionId);

    return {
      clientId: connectionId,
      users,
      queue: queueState.queue,
      currentClimbQueueItem: queueState.currentClimbQueueItem,
      sequence: queueState.sequence,
      stateHash: queueState.stateHash,
      isLeader,
    };
  }

  async leaveSession(connectionId: string): Promise<{ sessionId: string; newLeaderId?: string } | null> {
    const client = this.clients.get(connectionId);
    if (!client || !client.sessionId) {
      return null;
    }

    const sessionId = client.sessionId;
    const wasLeader = client.isLeader;

    // Remove from session
    const sessionClientIds = this.sessions.get(sessionId);
    if (sessionClientIds) {
      sessionClientIds.delete(connectionId);

      // Keep session alive when last user leaves (for hybrid persistence)
      if (sessionClientIds.size === 0) {
        this.sessions.delete(sessionId);

        // Mark session as inactive in Redis but DON'T delete (4h TTL starts)
        if (this.redisStore) {
          await this.redisStore.markInactive(sessionId);
          // Only clear legacy users store if distributed state is not enabled
          // When distributed state is enabled, user data is handled by DistributedStateManager
          if (!this.distributedState) {
            await this.redisStore.saveUsers(sessionId, []);
          }
          console.log(`[RoomManager] Session ${sessionId} marked inactive - will expire from Redis in 4 hours`);
        }

        // Update Postgres status to 'inactive' (keep queue state for recovery)
        await db
          .update(sessions)
          .set({ status: 'inactive', lastActivity: new Date() })
          .where(eq(sessions.id, sessionId));

        // DON'T call cleanupSessionQueue anymore - we keep the queue for later restoration
      }
    }

    // Reset client state
    client.sessionId = null;
    client.isLeader = false;

    // Remove from database
    await this.persistSessionLeave(connectionId);

    // Elect new leader
    let newLeaderId: string | undefined;

    if (this.distributedState) {
      // Use distributed state for cross-instance leader election
      const result = await this.distributedState.leaveSession(connectionId, sessionId);
      if (result.newLeaderId) {
        newLeaderId = result.newLeaderId;
        // Update local client state if the new leader is on this instance
        const localNewLeader = this.clients.get(newLeaderId);
        if (localNewLeader) {
          localNewLeader.isLeader = true;
        }
        // Persist to Postgres - distributed state is source of truth, so log but don't fail
        try {
          await this.persistLeaderChange(sessionId, newLeaderId);
        } catch (error) {
          console.error(
            `[RoomManager] Failed to persist leader change to Postgres for session ${sessionId}:`,
            error
          );
        }
      }
    } else if (wasLeader && sessionClientIds && sessionClientIds.size > 0) {
      // Single instance mode: pick earliest connected client
      const clientsArray = Array.from(sessionClientIds)
        .map((id) => this.clients.get(id))
        .filter((c): c is ConnectedClient => c !== undefined)
        .sort((a, b) => a.connectedAt.getTime() - b.connectedAt.getTime());

      if (clientsArray.length > 0) {
        const newLeader = clientsArray[0];
        newLeader.isLeader = true;
        newLeaderId = newLeader.connectionId;
        try {
          await this.persistLeaderChange(sessionId, newLeaderId);
        } catch (error) {
          console.error(
            `[RoomManager] Failed to persist leader change to Postgres for session ${sessionId}:`,
            error
          );
        }
      }
    }

    return { sessionId, newLeaderId };
  }

  /**
   * Remove a client from the system.
   * @returns Object indicating success/failure of distributed state cleanup.
   *          Local cleanup always succeeds.
   */
  async removeClient(connectionId: string): Promise<{ distributedStateCleanedUp: boolean }> {
    let distributedStateCleanedUp = true;

    // Remove from distributed state first to ensure consistency
    if (this.distributedState) {
      try {
        const result = await this.distributedState.removeConnection(connectionId);
        // Log if there was a leader change from this removal
        if (result.newLeaderId) {
          console.log(`[RoomManager] New leader ${result.newLeaderId.slice(0, 8)} elected after client removal`);
        }
      } catch (err) {
        // Log but continue with local cleanup - don't leave ghost clients locally
        // The distributed state may have partial data that will eventually expire via TTL
        distributedStateCleanedUp = false;
        console.error(
          `[RoomManager] Failed to remove connection ${connectionId.slice(0, 8)} from distributed state. ` +
          `Redis data may remain until TTL expires. Error: ${err}`
        );
      }
    }

    // Clean up local state to prevent memory leaks
    const client = this.clients.get(connectionId);
    if (client?.sessionId) {
      // Remove from session membership set
      const sessionSet = this.sessions.get(client.sessionId);
      if (sessionSet) {
        sessionSet.delete(connectionId);
        // Clean up empty session sets to prevent memory buildup
        if (sessionSet.size === 0) {
          this.sessions.delete(client.sessionId);
        }
      }
    }
    this.clients.delete(connectionId);

    return { distributedStateCleanedUp };
  }

  /**
   * Get session users from all instances (async, uses distributed state if available).
   */
  async getSessionUsers(sessionId: string): Promise<SessionUser[]> {
    if (this.distributedState) {
      return this.distributedState.getSessionMembers(sessionId);
    }
    return this.getSessionUsersLocal(sessionId);
  }

  /**
   * Get session users from local instance only.
   * Used when distributed state is not available or for internal operations.
   */
  getSessionUsersLocal(sessionId: string): SessionUser[] {
    const sessionClientIds = this.sessions.get(sessionId);
    if (!sessionClientIds) return [];

    const users: SessionUser[] = [];
    for (const clientId of sessionClientIds) {
      const client = this.clients.get(clientId);
      if (client) {
        users.push({
          id: client.connectionId,
          username: client.username,
          isLeader: client.isLeader,
          avatarUrl: client.avatarUrl,
        });
      }
    }
    return users;
  }

  getSessionClients(sessionId: string): string[] {
    const session = this.sessions.get(sessionId);
    return session ? Array.from(session) : [];
  }

  /**
   * Check if a session is active (has connected users across all instances OR exists in Redis within TTL)
   */
  async isSessionActive(sessionId: string): Promise<boolean> {
    // Check distributed state first for cross-instance member count
    if (this.distributedState) {
      const hasMembers = await this.distributedState.hasSessionMembers(sessionId);
      if (hasMembers) {
        return true;
      }
    } else {
      // Single instance mode: check local sessions
      const participantCount = this.sessions.get(sessionId)?.size || 0;
      if (participantCount > 0) {
        return true;
      }
    }

    // Check Redis session store for inactive-but-recoverable sessions
    if (this.redisStore) {
      return this.redisStore.exists(sessionId);
    }
    return false;
  }

  async updateUsername(connectionId: string, username: string, avatarUrl?: string): Promise<void> {
    const client = this.clients.get(connectionId);
    if (client) {
      client.username = username;
      if (avatarUrl !== undefined) {
        client.avatarUrl = avatarUrl;
      }
      // Persist to database
      await db.update(sessionClients).set({ username }).where(eq(sessionClients.id, connectionId));

      // Update distributed state
      if (this.distributedState) {
        await this.distributedState.updateUsername(connectionId, username, avatarUrl);
      }
    }
  }

  async updateQueueState(
    sessionId: string,
    queue: ClimbQueueItem[],
    currentClimbQueueItem: ClimbQueueItem | null,
    expectedVersion?: number
  ): Promise<{ version: number; sequence: number; stateHash: string }> {
    // Get current version and sequence from Redis if available, otherwise from Postgres
    let currentVersion = expectedVersion;
    let currentSequence = 0;

    if (currentVersion === undefined) {
      if (this.redisStore) {
        const redisSession = await this.redisStore.getSession(sessionId);
        currentVersion = redisSession?.version ?? 0;
        currentSequence = redisSession?.sequence ?? 0;
      }
      if (currentVersion === undefined || currentVersion === 0) {
        const pgState = await this.getQueueState(sessionId);
        currentVersion = pgState.version;
        currentSequence = pgState.sequence;
      }
    } else {
      // If version is provided, get sequence from Redis or Postgres
      if (this.redisStore) {
        const redisSession = await this.redisStore.getSession(sessionId);
        currentSequence = redisSession?.sequence ?? 0;
      }
      if (currentSequence === 0) {
        const pgState = await this.getQueueState(sessionId);
        currentSequence = pgState.sequence;
      }
    }

    const newVersion = currentVersion + 1;
    const newSequence = currentSequence + 1;
    const stateHash = computeQueueStateHash(queue, currentClimbQueueItem?.uuid || null);

    // Write to Redis immediately (source of truth for active sessions)
    if (this.redisStore) {
      await this.redisStore.updateQueueState(sessionId, queue, currentClimbQueueItem, newVersion, newSequence, stateHash);
    }

    // Debounce Postgres write (30 seconds) - eventual consistency
    this.schedulePostgresWrite(sessionId, queue, currentClimbQueueItem, newVersion, newSequence);

    return { version: newVersion, sequence: newSequence, stateHash };
  }

  /**
   * Update queue state with immediate Postgres write (for critical operations).
   * Use this when you need immediate Postgres consistency (e.g., session creation).
   */
  async updateQueueStateImmediate(
    sessionId: string,
    queue: ClimbQueueItem[],
    currentClimbQueueItem: ClimbQueueItem | null,
    expectedVersion?: number
  ): Promise<number> {
    if (expectedVersion !== undefined) {
      if (expectedVersion === 0) {
        // Version 0 means no row exists yet - try to insert
        const result = await db
          .insert(sessionQueues)
          .values({
            sessionId,
            queue,
            currentClimbQueueItem,
            version: 1,
            sequence: 1, // Initial sequence for new session
            updatedAt: new Date(),
          })
          .onConflictDoNothing()
          .returning();

        if (result.length === 0) {
          throw new VersionConflictError(sessionId, expectedVersion);
        }

        // Also update Redis
        if (this.redisStore) {
          const stateHash = computeQueueStateHash(queue, currentClimbQueueItem?.uuid || null);
          await this.redisStore.updateQueueState(sessionId, queue, currentClimbQueueItem, result[0].version, result[0].sequence, stateHash);
        }

        return result[0].version;
      }

      // Optimistic locking: only update if version matches
      const result = await db
        .update(sessionQueues)
        .set({
          queue,
          currentClimbQueueItem,
          version: sql`${sessionQueues.version} + 1`,
          sequence: sql`${sessionQueues.sequence} + 1`,
          updatedAt: new Date(),
        })
        .where(and(
          eq(sessionQueues.sessionId, sessionId),
          eq(sessionQueues.version, expectedVersion)
        ))
        .returning();

      if (result.length === 0) {
        throw new VersionConflictError(sessionId, expectedVersion);
      }

      // Also update Redis
      if (this.redisStore) {
        const stateHash = computeQueueStateHash(queue, currentClimbQueueItem?.uuid || null);
        await this.redisStore.updateQueueState(sessionId, queue, currentClimbQueueItem, result[0].version, result[0].sequence, stateHash);
      }

      return result[0].version;
    }

    // No version check - insert or update
    const result = await db
      .insert(sessionQueues)
      .values({
        sessionId,
        queue,
        currentClimbQueueItem,
        version: 1,
        sequence: 1, // Initial sequence for new session
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: sessionQueues.sessionId,
        set: {
          queue,
          currentClimbQueueItem,
          version: sql`${sessionQueues.version} + 1`,
          sequence: sql`${sessionQueues.sequence} + 1`,
          updatedAt: new Date(),
        },
      })
      .returning();

    const newVersion = result[0]?.version ?? 1;
    const newSequence = result[0]?.sequence ?? 1;

    // Also update Redis
    if (this.redisStore) {
      const stateHash = computeQueueStateHash(queue, currentClimbQueueItem?.uuid || null);
      await this.redisStore.updateQueueState(sessionId, queue, currentClimbQueueItem, newVersion, newSequence, stateHash);
    }

    return newVersion;
  }

  /**
   * Update only the queue without touching currentClimbQueueItem.
   * Uses Redis as source of truth for real-time state. Postgres writes are debounced.
   * This avoids race conditions when other operations are modifying currentClimbQueueItem.
   */
  async updateQueueOnly(
    sessionId: string,
    queue: ClimbQueueItem[],
    expectedVersion?: number
  ): Promise<{ version: number; sequence: number; stateHash: string }> {
    // Get current state from Redis (source of truth for real-time sync)
    let currentVersion = 0;
    let currentSequence = 0;
    let currentClimbQueueItem: ClimbQueueItem | null = null;

    if (this.redisStore) {
      const redisSession = await this.redisStore.getSession(sessionId);
      if (redisSession) {
        currentVersion = redisSession.version;
        currentSequence = redisSession.sequence;
        currentClimbQueueItem = redisSession.currentClimbQueueItem;
      }
    }

    // Fallback to Postgres if Redis doesn't have the data
    if (currentVersion === 0 && currentSequence === 0) {
      const pgState = await this.getQueueState(sessionId);
      currentVersion = pgState.version;
      currentSequence = pgState.sequence;
      currentClimbQueueItem = pgState.currentClimbQueueItem;
    }

    // Validate expectedVersion if provided (optimistic locking)
    if (expectedVersion !== undefined && currentVersion !== expectedVersion) {
      throw new VersionConflictError(sessionId, expectedVersion);
    }

    const newVersion = currentVersion + 1;
    const newSequence = currentSequence + 1;
    const stateHash = computeQueueStateHash(queue, currentClimbQueueItem?.uuid || null);

    // Write to Redis immediately (source of truth for real-time state)
    if (this.redisStore) {
      await this.redisStore.updateQueueState(
        sessionId, queue, currentClimbQueueItem, newVersion, newSequence, stateHash
      );
    }

    // Debounce Postgres write (for queue history - eventual consistency)
    this.schedulePostgresWrite(sessionId, queue, currentClimbQueueItem, newVersion, newSequence);

    return { version: newVersion, sequence: newSequence, stateHash };
  }

  async getQueueState(sessionId: string): Promise<{
    queue: ClimbQueueItem[];
    currentClimbQueueItem: ClimbQueueItem | null;
    version: number;
    sequence: number;
    stateHash: string;
  }> {
    // Check Redis first (source of truth for active sessions)
    // Redis is written to immediately, while Postgres writes are debounced (30s)
    if (this.redisStore) {
      const redisSession = await this.redisStore.getSession(sessionId);
      if (redisSession) {
        return {
          queue: redisSession.queue,
          currentClimbQueueItem: redisSession.currentClimbQueueItem,
          version: redisSession.version,
          sequence: redisSession.sequence,
          stateHash: redisSession.stateHash,
        };
      }
    }

    // Fall back to Postgres (for dormant sessions or when Redis is unavailable)
    const result = await db.select().from(sessionQueues).where(eq(sessionQueues.sessionId, sessionId)).limit(1);

    if (result.length === 0) {
      // Return initial state with empty hash
      return {
        queue: [],
        currentClimbQueueItem: null,
        version: 0,
        sequence: 0,
        stateHash: computeQueueStateHash([], null),
      };
    }

    // Compute hash from current state
    const stateHash = computeQueueStateHash(
      result[0].queue,
      result[0].currentClimbQueueItem?.uuid || null
    );

    return {
      queue: result[0].queue,
      currentClimbQueueItem: result[0].currentClimbQueueItem,
      version: result[0].version,
      sequence: result[0].sequence,
      stateHash,
    };
  }

  /**
   * Get a session by its ID from the database
   */
  async getSessionById(sessionId: string): Promise<Session | null> {
    const result = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
    return result[0] || null;
  }

  /**
   * Create a discoverable session with GPS coordinates
   */
  async createDiscoverableSession(
    sessionId: string,
    boardPath: string,
    userId: string,
    latitude: number,
    longitude: number,
    name?: string
  ): Promise<Session> {
    const result = await db
      .insert(sessions)
      .values({
        id: sessionId,
        boardPath,
        latitude,
        longitude,
        discoverable: true,
        createdByUserId: userId,
        name: name || null,
        lastActivity: new Date(),
      })
      .onConflictDoUpdate({
        target: sessions.id,
        set: {
          boardPath,
          latitude,
          longitude,
          discoverable: true,
          createdByUserId: userId,
          name: name || null,
          lastActivity: new Date(),
        },
      })
      .returning();

    return result[0];
  }

  /**
   * Find discoverable sessions near a location (within radius)
   * Uses bounding box for initial SQL filter, then precise Haversine distance
   */
  async findNearbySessions(
    latitude: number,
    longitude: number,
    radiusMeters: number = DEFAULT_SEARCH_RADIUS_METERS
  ): Promise<DiscoverableSession[]> {
    const box = getBoundingBox(latitude, longitude, radiusMeters);

    // Query sessions within bounding box that are discoverable (exclude ended sessions)
    const candidates = await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.discoverable, true),
          ne(sessions.status, 'ended'), // Exclude explicitly ended sessions
          gte(sessions.latitude, box.minLat),
          lte(sessions.latitude, box.maxLat),
          gte(sessions.longitude, box.minLon),
          lte(sessions.longitude, box.maxLon)
        )
      );

    // Calculate precise distance and filter/sort
    type SessionWithCoords = Session & { latitude: number; longitude: number };
    const sessionsWithDistance = candidates
      .filter((s): s is SessionWithCoords =>
        s.latitude !== null && s.longitude !== null)
      .map((s: SessionWithCoords) => ({
        session: s,
        distance: haversineDistance(latitude, longitude, s.latitude, s.longitude),
      }))
      .filter((item: { session: SessionWithCoords; distance: number }) => item.distance <= radiusMeters)
      .sort((a: { distance: number }, b: { distance: number }) => a.distance - b.distance);

    // Get participant counts and active status for each session
    const sessionIds = sessionsWithDistance.map(({ session }) => session.id);

    // Batch check Redis existence to avoid N+1 queries
    let redisExistsMap: Map<string, boolean> = new Map();
    if (this.redisStore && sessionIds.length > 0) {
      redisExistsMap = await this.redisStore.batchExists(sessionIds);
    }

    const result: DiscoverableSession[] = [];
    for (const { session, distance } of sessionsWithDistance) {
      // Use distributed state for accurate cross-instance participant count
      let participantCount: number;
      if (this.distributedState) {
        participantCount = await this.distributedState.getSessionMemberCount(session.id);
      } else {
        participantCount = this.sessions.get(session.id)?.size || 0;
      }

      // Session is active if it has connected users OR exists in Redis (within 4h TTL)
      let isActive = participantCount > 0;
      if (!isActive && this.redisStore) {
        isActive = redisExistsMap.get(session.id) || false;
      }

      result.push({
        id: session.id,
        name: session.name,
        boardPath: session.boardPath,
        latitude: session.latitude!,
        longitude: session.longitude!,
        createdAt: session.createdAt,
        createdByUserId: session.createdByUserId,
        participantCount,
        distance,
        isActive,
      });
    }

    return result;
  }

  /**
   * Get sessions created by a user (within 7 days)
   */
  async getUserSessions(userId: string): Promise<Session[]> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const result = await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.createdByUserId, userId),
          gt(sessions.createdAt, sevenDaysAgo)
        )
      )
      .orderBy(sessions.lastActivity);

    return result;
  }

  private async persistSessionJoin(
    sessionId: string,
    boardPath: string,
    clientId: string,
    username: string,
    isLeader: boolean
  ): Promise<void> {
    // Ensure session exists
    // Note: Explicitly provide all column values to avoid DEFAULT keyword issues with Neon driver
    const now = new Date();
    await db
      .insert(sessions)
      .values({
        id: sessionId,
        boardPath,
        createdAt: now,
        lastActivity: now,
        latitude: null,
        longitude: null,
        discoverable: false,
        createdByUserId: null,
        name: null,
      })
      .onConflictDoUpdate({
        target: sessions.id,
        set: { boardPath, lastActivity: now },
      });

    // Add client to session
    await db
      .insert(sessionClients)
      .values({
        id: clientId,
        sessionId,
        username,
        isLeader,
      })
      .onConflictDoUpdate({
        target: sessionClients.id,
        set: { sessionId, username, isLeader },
      });
  }

  private async persistSessionLeave(clientId: string): Promise<void> {
    await db.delete(sessionClients).where(eq(sessionClients.id, clientId));
  }

  private async persistLeaderChange(sessionId: string, newLeaderId: string): Promise<void> {
    // Remove leader status from all clients in session
    await db.update(sessionClients).set({ isLeader: false }).where(eq(sessionClients.sessionId, sessionId));

    // Set new leader
    await db.update(sessionClients).set({ isLeader: true }).where(eq(sessionClients.id, newLeaderId));
  }

  /**
   * Get the Redis lock key for session restoration.
   */
  private getSessionRestoreLockKey(sessionId: string): string {
    return `boardsesh:lock:session:restore:${sessionId}`;
  }

  /**
   * Calculate exponential backoff delay for retry attempts.
   */
  private calculateRetryDelay(attempt: number): number {
    return Math.min(
      this.RETRY_BASE_DELAY * Math.pow(2, attempt),
      30000 // Max 30 seconds
    );
  }

  /**
   * Retry a failed Postgres write with exponential backoff.
   */
  private async retryPostgresWrite(
    sessionId: string,
    state: { queue: ClimbQueueItem[]; currentClimbQueueItem: ClimbQueueItem | null; version: number }
  ): Promise<void> {
    const attempts = this.writeRetryAttempts.get(sessionId) || 0;

    if (attempts >= this.MAX_RETRY_ATTEMPTS) {
      console.error(
        `[RoomManager] Max retry attempts (${this.MAX_RETRY_ATTEMPTS}) reached for session ${sessionId}. ` +
        `Data may be lost. Last state:`,
        { queueLength: state.queue.length, version: state.version }
      );
      this.pendingWrites.delete(sessionId);
      this.writeRetryAttempts.delete(sessionId);
      this.retryTimers.delete(sessionId);
      return;
    }

    this.writeRetryAttempts.set(sessionId, attempts + 1);
    const delay = this.calculateRetryDelay(attempts);

    console.log(
      `[RoomManager] Scheduling retry ${attempts + 1}/${this.MAX_RETRY_ATTEMPTS} ` +
      `for session ${sessionId} in ${delay}ms`
    );

    // Clear any existing retry timer for this session
    const existingTimer = this.retryTimers.get(sessionId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(async () => {
      // Clean up timer reference when it executes
      this.retryTimers.delete(sessionId);

      const currentState = this.pendingWrites.get(sessionId);
      if (currentState) {
        try {
          await this.writeQueueStateToPostgres(sessionId, currentState);
          this.pendingWrites.delete(sessionId);
          this.writeRetryAttempts.delete(sessionId);
          console.log(`[RoomManager] Retry successful for session ${sessionId}`);
        } catch (error) {
          console.error(
            `[RoomManager] Retry ${attempts + 1} failed for session ${sessionId}:`,
            error
          );
          await this.retryPostgresWrite(sessionId, currentState);
        }
      }
    }, delay);

    this.retryTimers.set(sessionId, timer);
  }

  /**
   * Schedule a debounced write to Postgres for queue state (30 seconds).
   * Writes to Redis happen immediately, Postgres writes are batched.
   */
  private schedulePostgresWrite(
    sessionId: string,
    queue: ClimbQueueItem[],
    currentClimbQueueItem: ClimbQueueItem | null,
    version: number,
    sequence: number
  ): void {
    // Refresh session membership TTL on activity to prevent expiry during long sessions
    if (this.distributedState) {
      this.distributedState.refreshSessionMembership(sessionId).catch((err) => {
        console.warn(`[RoomManager] Failed to refresh session TTL for ${sessionId}:`, err);
      });
    }

    // Store latest state
    this.pendingWrites.set(sessionId, { queue, currentClimbQueueItem, version, sequence });

    // Clear existing timer
    const existingTimer = this.postgresWriteTimers.get(sessionId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Schedule write in 30 seconds
    const timer = setTimeout(async () => {
      const state = this.pendingWrites.get(sessionId);
      if (state) {
        try {
          await this.writeQueueStateToPostgres(sessionId, state);
          this.pendingWrites.delete(sessionId);
          this.postgresWriteTimers.delete(sessionId);
          console.log(`[RoomManager] Debounced Postgres write completed for session ${sessionId}`);
        } catch (error) {
          console.error(
            `[RoomManager] Debounced Postgres write failed for session ${sessionId}:`,
            error
          );
          // Retry with exponential backoff instead of giving up
          await this.retryPostgresWrite(sessionId, state);
        }
      }
    }, 30000); // 30 seconds

    this.postgresWriteTimers.set(sessionId, timer);
  }

  /**
   * Write queue state directly to Postgres (used by debouncer).
   */
  private async writeQueueStateToPostgres(
    sessionId: string,
    state: { queue: ClimbQueueItem[]; currentClimbQueueItem: ClimbQueueItem | null; version: number; sequence: number }
  ): Promise<void> {
    await db
      .insert(sessionQueues)
      .values({
        sessionId,
        queue: state.queue,
        currentClimbQueueItem: state.currentClimbQueueItem,
        version: state.version,
        sequence: state.sequence,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: sessionQueues.sessionId,
        set: {
          queue: state.queue,
          currentClimbQueueItem: state.currentClimbQueueItem,
          version: state.version,
          sequence: state.sequence,
          updatedAt: new Date(),
        },
      });
  }

  /**
   * Flush all pending debounced writes to Postgres immediately.
   * Called on graceful shutdown to ensure durability.
   */
  async flushPendingWrites(): Promise<void> {
    console.log(`[RoomManager] Flushing ${this.pendingWrites.size} pending writes to Postgres...`);

    const writePromises: Promise<void>[] = [];

    for (const [sessionId, state] of this.pendingWrites.entries()) {
      // Clear the debounce timer
      const timer = this.postgresWriteTimers.get(sessionId);
      if (timer) {
        clearTimeout(timer);
        this.postgresWriteTimers.delete(sessionId);
      }

      // Write immediately
      writePromises.push(
        this.writeQueueStateToPostgres(sessionId, state).catch((error) => {
          console.error(`[RoomManager] Failed to flush write for session ${sessionId}:`, error);
        })
      );
    }

    await Promise.all(writePromises);
    this.pendingWrites.clear();

    // Clear retry state to prevent memory leaks from abandoned sessions
    for (const timer of this.retryTimers.values()) {
      clearTimeout(timer);
    }
    this.retryTimers.clear();
    this.writeRetryAttempts.clear();

    console.log('[RoomManager] All pending writes flushed');
  }

  /**
   * Explicitly end a session (user action).
   * - Removes from Redis
   * - Marks as 'ended' in Postgres
   * - Keeps Postgres record for history
   */
  async endSession(sessionId: string): Promise<void> {
    // Remove from Redis
    if (this.redisStore) {
      await this.redisStore.deleteSession(sessionId);
    }

    // Mark as ended in Postgres
    await db
      .update(sessions)
      .set({ status: 'ended', lastActivity: new Date() })
      .where(eq(sessions.id, sessionId));

    // Remove from memory
    this.sessions.delete(sessionId);

    console.log(`[RoomManager] Session ${sessionId} explicitly ended`);
  }

  /**
   * Get all active session IDs (for TTL refresh).
   */
  getAllActiveSessions(): string[] {
    return Array.from(this.sessions.keys());
  }
}

export const roomManager = new RoomManager();
