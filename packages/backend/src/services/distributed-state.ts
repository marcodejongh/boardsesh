import type Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import type { SessionUser } from '@boardsesh/shared-schema';

/**
 * Connection data stored in Redis for cross-instance visibility.
 */
export interface DistributedConnection {
  connectionId: string;
  instanceId: string;
  sessionId: string | null;
  userId: string | null;
  username: string;
  avatarUrl: string | null;
  isLeader: boolean;
  connectedAt: number; // Unix timestamp ms
}

/**
 * Redis key prefixes for distributed state.
 */
const KEYS = {
  // Hash: connectionId -> connection data
  connection: (connectionId: string) => `boardsesh:conn:${connectionId}`,
  // Set: sessionId -> set of connectionIds
  sessionMembers: (sessionId: string) => `boardsesh:session:${sessionId}:members`,
  // String: sessionId -> connectionId of leader
  sessionLeader: (sessionId: string) => `boardsesh:session:${sessionId}:leader`,
  // Set: instanceId -> set of connectionIds owned by this instance
  instanceConnections: (instanceId: string) => `boardsesh:instance:${instanceId}:conns`,
  // String: instanceId -> heartbeat timestamp
  instanceHeartbeat: (instanceId: string) => `boardsesh:instance:${instanceId}:heartbeat`,
} as const;

/**
 * TTL values in seconds.
 */
const TTL = {
  connection: 60 * 60, // 1 hour - refreshed on activity
  instanceHeartbeat: 60, // 1 minute - refreshed every 30s
  sessionMembership: 4 * 60 * 60, // 4 hours - matches session TTL
} as const;

/**
 * Lua script for atomic leader election.
 * Atomically sets both the leader key AND the isLeader flag on the connection hash.
 * This prevents race conditions where process crashes between operations.
 * Returns: 1 if leader was set, 0 if leader already exists
 */
const LEADER_ELECTION_SCRIPT = `
  local leaderKey = KEYS[1]
  local connKey = KEYS[2]
  local connectionId = ARGV[1]

  -- Check if leader already exists
  local currentLeader = redis.call('GET', leaderKey)
  if currentLeader then
    return 0
  end

  -- Atomically set this connection as leader AND update isLeader flag
  redis.call('SET', leaderKey, connectionId)
  redis.call('HSET', connKey, 'isLeader', 'true')
  return 1
`;

/**
 * Lua script for atomic leader transfer.
 * Only transfers leadership if current leader matches expected.
 * Returns: 1 if transferred, 0 if not
 */
const LEADER_TRANSFER_SCRIPT = `
  local leaderKey = KEYS[1]
  local expectedLeader = ARGV[1]
  local newLeader = ARGV[2]

  local currentLeader = redis.call('GET', leaderKey)
  if currentLeader ~= expectedLeader then
    return 0
  end

  if newLeader == '' then
    redis.call('DEL', leaderKey)
  else
    redis.call('SET', leaderKey, newLeader)
  end
  return 1
`;

/**
 * Lua script to elect new leader from session members.
 * Picks the member with the earliest connectedAt timestamp.
 * Also refreshes the TTL on session members to prevent expiry during long sessions.
 * Returns: connectionId of new leader, or nil if no members
 */
const ELECT_NEW_LEADER_SCRIPT = `
  local sessionMembersKey = KEYS[1]
  local leaderKey = KEYS[2]
  local leavingConnectionId = ARGV[1]
  local membersTTL = tonumber(ARGV[2])

  -- Get all members except the leaving one
  local members = redis.call('SMEMBERS', sessionMembersKey)
  local candidates = {}

  for _, memberId in ipairs(members) do
    if memberId ~= leavingConnectionId then
      local connKey = 'boardsesh:conn:' .. memberId
      local connectedAt = redis.call('HGET', connKey, 'connectedAt')
      if connectedAt then
        table.insert(candidates, {memberId, tonumber(connectedAt)})
      end
    end
  end

  -- No candidates left
  if #candidates == 0 then
    redis.call('DEL', leaderKey)
    return nil
  end

  -- Sort by connectedAt (earliest first)
  table.sort(candidates, function(a, b) return a[2] < b[2] end)

  local newLeaderId = candidates[1][1]

  -- Set new leader
  redis.call('SET', leaderKey, newLeaderId)

  -- Update isLeader flag on the connection
  local connKey = 'boardsesh:conn:' .. newLeaderId
  redis.call('HSET', connKey, 'isLeader', 'true')

  -- Refresh TTL on session members set to prevent expiry during long sessions
  if membersTTL and membersTTL > 0 then
    redis.call('EXPIRE', sessionMembersKey, membersTTL)
  end

  return newLeaderId
`;

/**
 * DistributedStateManager provides cross-instance state management for:
 * - Connection tracking
 * - Session membership
 * - Leader election
 *
 * This enables true horizontal scaling without sticky sessions.
 */
export class DistributedStateManager {
  private readonly instanceId: string;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly redis: Redis,
    instanceId?: string
  ) {
    this.instanceId = instanceId || uuidv4();
  }

  /**
   * Get this instance's unique ID.
   */
  getInstanceId(): string {
    return this.instanceId;
  }

  /**
   * Start the heartbeat and cleanup background tasks.
   */
  start(): void {
    if (this.heartbeatInterval) {
      return;
    }

    // Update heartbeat every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      this.updateHeartbeat().catch((err) => {
        console.error('[DistributedState] Heartbeat update failed:', err);
      });
    }, 30_000);

    // Initial heartbeat
    this.updateHeartbeat().catch((err) => {
      console.error('[DistributedState] Initial heartbeat failed:', err);
    });

    console.log(`[DistributedState] Started with instance ID: ${this.instanceId.slice(0, 8)}`);
  }

  /**
   * Stop background tasks and clean up instance state.
   */
  async stop(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Clean up all connections for this instance
    await this.cleanupInstanceConnections();

    console.log(`[DistributedState] Stopped instance: ${this.instanceId.slice(0, 8)}`);
  }

  /**
   * Register a new connection in distributed state.
   */
  async registerConnection(
    connectionId: string,
    username: string,
    userId?: string | null,
    avatarUrl?: string | null
  ): Promise<void> {
    const connection: DistributedConnection = {
      connectionId,
      instanceId: this.instanceId,
      sessionId: null,
      userId: userId || null,
      username,
      avatarUrl: avatarUrl || null,
      isLeader: false,
      connectedAt: Date.now(),
    };

    const multi = this.redis.multi();

    // Store connection data
    multi.hmset(KEYS.connection(connectionId), this.connectionToHash(connection));
    multi.expire(KEYS.connection(connectionId), TTL.connection);

    // Track connection under this instance
    multi.sadd(KEYS.instanceConnections(this.instanceId), connectionId);

    await multi.exec();

    console.log(`[DistributedState] Registered connection: ${connectionId.slice(0, 8)} on instance: ${this.instanceId.slice(0, 8)}`);
  }

  /**
   * Remove a connection from distributed state.
   */
  async removeConnection(connectionId: string): Promise<{ sessionId: string | null; wasLeader: boolean }> {
    // Get current connection state
    const connection = await this.getConnection(connectionId);
    if (!connection) {
      return { sessionId: null, wasLeader: false };
    }

    const sessionId = connection.sessionId;
    const wasLeader = connection.isLeader;

    const multi = this.redis.multi();

    // Remove connection data
    multi.del(KEYS.connection(connectionId));

    // Remove from instance tracking
    multi.srem(KEYS.instanceConnections(this.instanceId), connectionId);

    // Remove from session if member
    if (sessionId) {
      multi.srem(KEYS.sessionMembers(sessionId), connectionId);
    }

    await multi.exec();

    console.log(`[DistributedState] Removed connection: ${connectionId.slice(0, 8)}`);

    return { sessionId, wasLeader };
  }

  /**
   * Get connection data from Redis.
   */
  async getConnection(connectionId: string): Promise<DistributedConnection | null> {
    const data = await this.redis.hgetall(KEYS.connection(connectionId));
    if (!data || !data.connectionId) {
      return null;
    }
    return this.hashToConnection(data);
  }

  /**
   * Check if a connection exists and belongs to a specific session.
   */
  async isConnectionInSession(connectionId: string, sessionId: string): Promise<boolean> {
    const connection = await this.getConnection(connectionId);
    return connection !== null && connection.sessionId === sessionId;
  }

  /**
   * Join a session. Handles leader election for first member.
   * Returns whether this connection became leader.
   */
  async joinSession(
    connectionId: string,
    sessionId: string,
    username?: string,
    avatarUrl?: string | null
  ): Promise<{ isLeader: boolean }> {
    // Update connection with session info
    const updates: Record<string, string> = {
      sessionId,
    };
    if (username) {
      updates.username = username;
    }
    if (avatarUrl !== undefined) {
      updates.avatarUrl = avatarUrl || '';
    }

    const multi = this.redis.multi();

    // Update connection
    multi.hmset(KEYS.connection(connectionId), updates);
    multi.expire(KEYS.connection(connectionId), TTL.connection);

    // Add to session members
    multi.sadd(KEYS.sessionMembers(sessionId), connectionId);
    multi.expire(KEYS.sessionMembers(sessionId), TTL.sessionMembership);

    await multi.exec();

    // Try to become leader (atomic operation - sets both leader key and isLeader flag)
    const becameLeader = await this.redis.eval(
      LEADER_ELECTION_SCRIPT,
      2,
      KEYS.sessionLeader(sessionId),
      KEYS.connection(connectionId),
      connectionId
    ) as number;

    if (becameLeader === 1) {
      console.log(`[DistributedState] Connection ${connectionId.slice(0, 8)} became leader of session ${sessionId.slice(0, 8)}`);
    }

    return { isLeader: becameLeader === 1 };
  }

  /**
   * Leave a session. Handles leader election if leaving member was leader.
   * Returns the new leader's connectionId if leadership changed.
   */
  async leaveSession(connectionId: string, sessionId: string): Promise<{ newLeaderId: string | null }> {
    const connection = await this.getConnection(connectionId);
    const wasLeader = connection?.isLeader || false;

    const multi = this.redis.multi();

    // Update connection
    multi.hmset(KEYS.connection(connectionId), {
      sessionId: '',
      isLeader: 'false',
    });

    // Remove from session members
    multi.srem(KEYS.sessionMembers(sessionId), connectionId);

    await multi.exec();

    // If was leader, elect new leader
    let newLeaderId: string | null = null;
    if (wasLeader) {
      try {
        newLeaderId = await this.redis.eval(
          ELECT_NEW_LEADER_SCRIPT,
          2,
          KEYS.sessionMembers(sessionId),
          KEYS.sessionLeader(sessionId),
          connectionId,
          TTL.sessionMembership.toString()
        ) as string | null;

        if (newLeaderId) {
          console.log(`[DistributedState] Elected new leader: ${newLeaderId.slice(0, 8)} for session ${sessionId.slice(0, 8)}`);
        }
      } catch (err) {
        console.error(`[DistributedState] Failed to elect new leader for session ${sessionId.slice(0, 8)}:`, err);
        // Clear the leader key to allow next join to become leader
        try {
          await this.redis.del(KEYS.sessionLeader(sessionId));
        } catch {
          // Ignore cleanup error
        }
      }
    }

    return { newLeaderId };
  }

  /**
   * Get all members of a session as SessionUser objects.
   * This aggregates data from all instances.
   */
  async getSessionMembers(sessionId: string): Promise<SessionUser[]> {
    const memberIds = await this.redis.smembers(KEYS.sessionMembers(sessionId));

    if (memberIds.length === 0) {
      return [];
    }

    // Batch fetch all connection data
    const pipeline = this.redis.pipeline();
    for (const memberId of memberIds) {
      pipeline.hgetall(KEYS.connection(memberId));
    }

    const results = await pipeline.exec();
    const users: SessionUser[] = [];

    if (results) {
      for (let i = 0; i < results.length; i++) {
        const [err, data] = results[i] as [Error | null, Record<string, string>];
        if (!err && data && data.connectionId) {
          const connection = this.hashToConnection(data);
          users.push({
            id: connection.connectionId,
            username: connection.username,
            isLeader: connection.isLeader,
            avatarUrl: connection.avatarUrl || undefined,
          });
        }
      }
    }

    return users;
  }

  /**
   * Get the current leader of a session.
   */
  async getSessionLeader(sessionId: string): Promise<string | null> {
    return this.redis.get(KEYS.sessionLeader(sessionId));
  }

  /**
   * Get count of members in a session.
   */
  async getSessionMemberCount(sessionId: string): Promise<number> {
    return this.redis.scard(KEYS.sessionMembers(sessionId));
  }

  /**
   * Update connection username.
   */
  async updateUsername(connectionId: string, username: string, avatarUrl?: string): Promise<void> {
    const updates: Record<string, string> = { username };
    if (avatarUrl !== undefined) {
      updates.avatarUrl = avatarUrl || '';
    }
    await this.redis.hmset(KEYS.connection(connectionId), updates);
  }

  /**
   * Refresh connection TTL and session membership TTL (call periodically for active connections).
   * This prevents long sessions from having their membership expire.
   */
  async refreshConnection(connectionId: string): Promise<void> {
    // Get connection to check if in a session
    const connection = await this.getConnection(connectionId);

    const multi = this.redis.multi();
    multi.expire(KEYS.connection(connectionId), TTL.connection);

    // Also refresh session membership TTL if in a session
    if (connection?.sessionId) {
      multi.expire(KEYS.sessionMembers(connection.sessionId), TTL.sessionMembership);
    }

    await multi.exec();
  }

  /**
   * Refresh session membership TTL directly (for long-running sessions).
   */
  async refreshSessionMembership(sessionId: string): Promise<void> {
    await this.redis.expire(KEYS.sessionMembers(sessionId), TTL.sessionMembership);
  }

  /**
   * Check if session has any members.
   */
  async hasSessionMembers(sessionId: string): Promise<boolean> {
    const count = await this.redis.scard(KEYS.sessionMembers(sessionId));
    return count > 0;
  }

  /**
   * Clean up session state when it becomes empty.
   */
  async cleanupEmptySession(sessionId: string): Promise<void> {
    const multi = this.redis.multi();
    multi.del(KEYS.sessionMembers(sessionId));
    multi.del(KEYS.sessionLeader(sessionId));
    await multi.exec();

    console.log(`[DistributedState] Cleaned up empty session: ${sessionId.slice(0, 8)}`);
  }

  /**
   * Update instance heartbeat.
   */
  private async updateHeartbeat(): Promise<void> {
    await this.redis.setex(
      KEYS.instanceHeartbeat(this.instanceId),
      TTL.instanceHeartbeat,
      Date.now().toString()
    );
  }

  /**
   * Clean up all connections belonging to this instance.
   * Called on graceful shutdown.
   */
  private async cleanupInstanceConnections(): Promise<void> {
    const connectionIds = await this.redis.smembers(KEYS.instanceConnections(this.instanceId));
    const failedConnectionIds: string[] = [];

    for (const connectionId of connectionIds) {
      try {
        const { sessionId, wasLeader } = await this.removeConnection(connectionId);

        // Handle leader election if needed
        if (sessionId && wasLeader) {
          try {
            await this.redis.eval(
              ELECT_NEW_LEADER_SCRIPT,
              2,
              KEYS.sessionMembers(sessionId),
              KEYS.sessionLeader(sessionId),
              connectionId,
              TTL.sessionMembership.toString()
            );
          } catch (err) {
            console.error(`[DistributedState] Failed to elect new leader during cleanup for ${connectionId.slice(0, 8)}:`, err);
          }
        }
      } catch (err) {
        console.error(`[DistributedState] Failed to remove connection ${connectionId.slice(0, 8)} during cleanup:`, err);
        failedConnectionIds.push(connectionId);
      }
    }

    // Force cleanup of failed connections to prevent orphaned data
    if (failedConnectionIds.length > 0) {
      console.warn(`[DistributedState] Force cleaning ${failedConnectionIds.length} failed connections`);
      const cleanupMulti = this.redis.multi();
      for (const connectionId of failedConnectionIds) {
        cleanupMulti.del(KEYS.connection(connectionId));
      }
      try {
        await cleanupMulti.exec();
      } catch (err) {
        console.error('[DistributedState] Failed to force cleanup connections:', err);
      }
    }

    // Remove instance tracking keys
    const multi = this.redis.multi();
    multi.del(KEYS.instanceConnections(this.instanceId));
    multi.del(KEYS.instanceHeartbeat(this.instanceId));
    await multi.exec();

    console.log(`[DistributedState] Cleaned up ${connectionIds.length} connections for instance: ${this.instanceId.slice(0, 8)}`);
  }

  /**
   * Convert connection object to Redis hash fields.
   */
  private connectionToHash(conn: DistributedConnection): Record<string, string> {
    return {
      connectionId: conn.connectionId,
      instanceId: conn.instanceId,
      sessionId: conn.sessionId || '',
      userId: conn.userId || '',
      username: conn.username,
      avatarUrl: conn.avatarUrl || '',
      isLeader: conn.isLeader ? 'true' : 'false',
      connectedAt: conn.connectedAt.toString(),
    };
  }

  /**
   * Convert Redis hash fields to connection object.
   */
  private hashToConnection(hash: Record<string, string>): DistributedConnection {
    return {
      connectionId: hash.connectionId,
      instanceId: hash.instanceId,
      sessionId: hash.sessionId || null,
      userId: hash.userId || null,
      username: hash.username,
      avatarUrl: hash.avatarUrl || null,
      isLeader: hash.isLeader === 'true',
      connectedAt: parseInt(hash.connectedAt, 10) || Date.now(),
    };
  }
}

// Singleton instance - initialized when Redis is available
let distributedStateManager: DistributedStateManager | null = null;

/**
 * Initialize the distributed state manager.
 * Call this during server startup when Redis is available.
 */
export function initializeDistributedState(redis: Redis, instanceId?: string): DistributedStateManager {
  if (distributedStateManager) {
    console.warn('[DistributedState] Already initialized, returning existing instance');
    return distributedStateManager;
  }

  distributedStateManager = new DistributedStateManager(redis, instanceId);
  return distributedStateManager;
}

/**
 * Get the distributed state manager instance.
 * Returns null if not initialized (single-instance mode).
 */
export function getDistributedState(): DistributedStateManager | null {
  return distributedStateManager;
}

/**
 * Check if distributed state is enabled (Redis available).
 */
export function isDistributedStateEnabled(): boolean {
  return distributedStateManager !== null;
}

/**
 * Shutdown the distributed state manager.
 */
export async function shutdownDistributedState(): Promise<void> {
  if (distributedStateManager) {
    await distributedStateManager.stop();
    distributedStateManager = null;
  }
}

/**
 * Reset the singleton state (for testing and hot-reload scenarios).
 * This clears the singleton without calling stop() on it.
 * Use shutdownDistributedState() for graceful cleanup.
 */
export function resetDistributedState(): void {
  distributedStateManager = null;
}
