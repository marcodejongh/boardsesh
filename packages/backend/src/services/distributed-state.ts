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
 * Atomically sets both the leader key (with TTL) AND the isLeader flag on the connection hash.
 * This prevents race conditions where process crashes between operations.
 * Returns: 1 if leader was set, 0 if leader already exists
 */
const LEADER_ELECTION_SCRIPT = `
  local leaderKey = KEYS[1]
  local connKey = KEYS[2]
  local connectionId = ARGV[1]
  local leaderTTL = tonumber(ARGV[2])

  -- Check if leader already exists
  local currentLeader = redis.call('GET', leaderKey)
  if currentLeader then
    return 0
  end

  -- Atomically set this connection as leader with TTL AND update isLeader flag
  redis.call('SET', leaderKey, connectionId, 'EX', leaderTTL)
  redis.call('HSET', connKey, 'isLeader', 'true')
  return 1
`;

/**
 * Lua script to elect new leader from session members.
 * Picks the member with the earliest connectedAt timestamp.
 * Also clears the old leader's isLeader flag and refreshes TTL.
 * Returns: connectionId of new leader, or nil if no members
 *
 * Note: This script clears isLeader for the old leader regardless of whether
 * they are the leaving connection. This ensures no stale isLeader flags remain
 * even if the calling code order changes (e.g., if script runs before connection deletion).
 */
const ELECT_NEW_LEADER_SCRIPT = `
  local sessionMembersKey = KEYS[1]
  local leaderKey = KEYS[2]
  local leavingConnectionId = ARGV[1]
  local membersTTL = tonumber(ARGV[2])
  local leaderTTL = tonumber(ARGV[3])

  -- Get and clear old leader's isLeader flag first (including leaving connection for robustness)
  local oldLeader = redis.call('GET', leaderKey)
  if oldLeader then
    local oldLeaderConnKey = 'boardsesh:conn:' .. oldLeader
    if redis.call('EXISTS', oldLeaderConnKey) == 1 then
      redis.call('HSET', oldLeaderConnKey, 'isLeader', 'false')
    end
  end

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

  -- Set new leader with TTL
  redis.call('SET', leaderKey, newLeaderId, 'EX', leaderTTL)

  -- Update isLeader flag on the new leader connection
  local connKey = 'boardsesh:conn:' .. newLeaderId
  redis.call('HSET', connKey, 'isLeader', 'true')

  -- Refresh TTL on session members set to prevent expiry during long sessions
  if membersTTL and membersTTL > 0 then
    redis.call('EXPIRE', sessionMembersKey, membersTTL)
  end

  return newLeaderId
`;

/**
 * Lua script for atomic leave session operation.
 * Atomically checks leader status, updates connection, removes from session, and elects new leader.
 * This prevents race conditions where leader status could change between read and update.
 * Returns: newLeaderId if was leader and new leader elected, empty string if was leader but no candidates, nil if not leader
 */
const LEAVE_SESSION_SCRIPT = `
  local connKey = KEYS[1]
  local sessionMembersKey = KEYS[2]
  local leaderKey = KEYS[3]
  local connectionId = ARGV[1]
  local membersTTL = tonumber(ARGV[2])
  local leaderTTL = tonumber(ARGV[3])

  -- Get current leader to check if this connection is leader (atomically)
  local currentLeader = redis.call('GET', leaderKey)
  local wasLeader = (currentLeader == connectionId)

  -- Update connection state
  redis.call('HMSET', connKey, 'sessionId', '', 'isLeader', 'false')

  -- Remove from session members
  redis.call('SREM', sessionMembersKey, connectionId)

  -- If not leader, return nil (no leader election needed)
  if not wasLeader then
    return nil
  end

  -- Was leader, need to elect new one
  local members = redis.call('SMEMBERS', sessionMembersKey)
  local candidates = {}

  for _, memberId in ipairs(members) do
    if memberId ~= connectionId then
      local memberConnKey = 'boardsesh:conn:' .. memberId
      local connectedAt = redis.call('HGET', memberConnKey, 'connectedAt')
      if connectedAt then
        table.insert(candidates, {memberId, tonumber(connectedAt)})
      end
    end
  end

  -- No candidates left
  if #candidates == 0 then
    redis.call('DEL', leaderKey)
    return ''  -- Empty string means was leader but no new leader
  end

  -- Sort by connectedAt (earliest first)
  table.sort(candidates, function(a, b) return a[2] < b[2] end)

  local newLeaderId = candidates[1][1]

  -- Set new leader with TTL
  redis.call('SET', leaderKey, newLeaderId, 'EX', leaderTTL)

  -- Update isLeader flag on new leader
  local newLeaderConnKey = 'boardsesh:conn:' .. newLeaderId
  redis.call('HSET', newLeaderConnKey, 'isLeader', 'true')

  -- Refresh session members TTL
  if membersTTL and membersTTL > 0 then
    redis.call('EXPIRE', sessionMembersKey, membersTTL)
  end

  return newLeaderId
`;

/**
 * Lua script for atomic session join with leader election.
 * Atomically updates connection, adds to session members, and attempts leader election.
 * This prevents race conditions where a crash between these operations could leave
 * a connection in the members set without proper leader election.
 * Returns: 1 if became leader, 0 if not
 */
const JOIN_SESSION_SCRIPT = `
  local connKey = KEYS[1]
  local sessionMembersKey = KEYS[2]
  local leaderKey = KEYS[3]
  local connectionId = ARGV[1]
  local sessionId = ARGV[2]
  local connTTL = tonumber(ARGV[3])
  local sessionTTL = tonumber(ARGV[4])
  local username = ARGV[5]
  local avatarUrl = ARGV[6]

  -- Update connection with session info
  redis.call('HSET', connKey, 'sessionId', sessionId)
  if username and username ~= '' then
    redis.call('HSET', connKey, 'username', username)
  end
  if avatarUrl then
    redis.call('HSET', connKey, 'avatarUrl', avatarUrl)
  end
  redis.call('EXPIRE', connKey, connTTL)

  -- Add to session members
  redis.call('SADD', sessionMembersKey, connectionId)
  redis.call('EXPIRE', sessionMembersKey, sessionTTL)

  -- Try to become leader (only if no leader exists)
  local currentLeader = redis.call('GET', leaderKey)
  if currentLeader then
    return 0  -- Already has a leader
  end

  -- Become leader
  redis.call('SET', leaderKey, connectionId, 'EX', sessionTTL)
  redis.call('HSET', connKey, 'isLeader', 'true')
  return 1
`;

/**
 * Lua script for atomic TTL refresh of connection and session membership.
 * Atomically refreshes both TTLs based on the connection's current session.
 * Returns: 1 if successful, 0 if connection doesn't exist
 */
const REFRESH_TTL_SCRIPT = `
  local connKey = KEYS[1]
  local connTTL = tonumber(ARGV[1])
  local sessionTTL = tonumber(ARGV[2])

  -- Check if connection exists
  if redis.call('EXISTS', connKey) == 0 then
    return 0
  end

  -- Refresh connection TTL
  redis.call('EXPIRE', connKey, connTTL)

  -- Get session ID and refresh session membership TTL if in a session
  local sessionId = redis.call('HGET', connKey, 'sessionId')
  if sessionId and sessionId ~= '' then
    local sessionMembersKey = 'boardsesh:session:' .. sessionId .. ':members'
    redis.call('EXPIRE', sessionMembersKey, sessionTTL)
  end

  return 1
`;

/**
 * Validate connectionId format to prevent Redis key injection.
 * ConnectionIds should be UUIDs or similar safe identifiers.
 */
function validateConnectionId(connectionId: string): void {
  // Allow alphanumeric, hyphens, and underscores (UUID-compatible)
  // Max length prevents memory attacks
  if (!connectionId || connectionId.length > 128 || !/^[a-zA-Z0-9_-]+$/.test(connectionId)) {
    throw new Error(`Invalid connectionId format: ${connectionId.slice(0, 20)}`);
  }
}

/**
 * Validate sessionId format to prevent Redis key injection.
 */
function validateSessionId(sessionId: string): void {
  if (!sessionId || sessionId.length > 128 || !/^[a-zA-Z0-9_-]+$/.test(sessionId)) {
    throw new Error(`Invalid sessionId format: ${sessionId.slice(0, 20)}`);
  }
}

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
    this.stopHeartbeat();

    // Clean up all connections for this instance
    await this.cleanupInstanceConnections();

    console.log(`[DistributedState] Stopped instance: ${this.instanceId.slice(0, 8)}`);
  }

  /**
   * Stop only the heartbeat interval synchronously.
   * Used by forceResetDistributedState to prevent memory leaks.
   */
  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Check if the manager has been stopped (heartbeat cleared).
   */
  isStopped(): boolean {
    return this.heartbeatInterval === null;
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
    validateConnectionId(connectionId);

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
   * Automatically handles leader election if the removed connection was a leader.
   * @param connectionId - The connection to remove
   * @param electNewLeader - Whether to automatically elect a new leader (default: true)
   */
  async removeConnection(
    connectionId: string,
    electNewLeader: boolean = true
  ): Promise<{ sessionId: string | null; wasLeader: boolean; newLeaderId: string | null }> {
    validateConnectionId(connectionId);

    // Get current connection state
    const connection = await this.getConnection(connectionId);
    if (!connection) {
      return { sessionId: null, wasLeader: false, newLeaderId: null };
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

    // Automatically elect new leader if was leader and requested
    let newLeaderId: string | null = null;
    if (sessionId && wasLeader && electNewLeader) {
      try {
        newLeaderId = await this.redis.eval(
          ELECT_NEW_LEADER_SCRIPT,
          2,
          KEYS.sessionMembers(sessionId),
          KEYS.sessionLeader(sessionId),
          connectionId,
          TTL.sessionMembership.toString(),
          TTL.sessionMembership.toString() // Leader TTL matches session TTL
        ) as string | null;

        if (newLeaderId) {
          console.log(`[DistributedState] Elected new leader: ${newLeaderId.slice(0, 8)} after removing ${connectionId.slice(0, 8)}`);
        }
      } catch (err) {
        console.error(`[DistributedState] Failed to elect new leader after removing ${connectionId.slice(0, 8)}:`, err);
        // Clear the leader key to allow next join to become leader
        try {
          await this.redis.del(KEYS.sessionLeader(sessionId));
        } catch {
          // Ignore cleanup error
        }
      }
    }

    return { sessionId, wasLeader, newLeaderId };
  }

  /**
   * Get connection data from Redis.
   */
  async getConnection(connectionId: string): Promise<DistributedConnection | null> {
    validateConnectionId(connectionId);
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
    validateConnectionId(connectionId);
    validateSessionId(sessionId);
    const connection = await this.getConnection(connectionId);
    return connection !== null && connection.sessionId === sessionId;
  }

  /**
   * Join a session. Handles leader election for first member.
   * Uses atomic Lua script to prevent race conditions between session join and leader election.
   * Returns whether this connection became leader.
   */
  async joinSession(
    connectionId: string,
    sessionId: string,
    username?: string,
    avatarUrl?: string | null
  ): Promise<{ isLeader: boolean }> {
    validateConnectionId(connectionId);
    validateSessionId(sessionId);

    // Use atomic script that handles session join and leader election together
    // This prevents race conditions where a crash between operations could leave
    // a connection in the members set without proper leader election
    const becameLeader = (await this.redis.eval(
      JOIN_SESSION_SCRIPT,
      3,
      KEYS.connection(connectionId),
      KEYS.sessionMembers(sessionId),
      KEYS.sessionLeader(sessionId),
      connectionId,
      sessionId,
      TTL.connection.toString(),
      TTL.sessionMembership.toString(),
      username || '',
      avatarUrl !== undefined ? (avatarUrl || '') : ''
    )) as number;

    if (becameLeader === 1) {
      console.log(`[DistributedState] Connection ${connectionId.slice(0, 8)} became leader of session ${sessionId.slice(0, 8)}`);
    }

    return { isLeader: becameLeader === 1 };
  }

  /**
   * Leave a session. Handles leader election if leaving member was leader.
   * Uses atomic Lua script to prevent race conditions.
   * Returns the new leader's connectionId if leadership changed.
   */
  async leaveSession(connectionId: string, sessionId: string): Promise<{ newLeaderId: string | null }> {
    validateConnectionId(connectionId);
    validateSessionId(sessionId);

    try {
      // Use atomic script that checks leader, updates connection, and elects new leader
      const result = await this.redis.eval(
        LEAVE_SESSION_SCRIPT,
        3,
        KEYS.connection(connectionId),
        KEYS.sessionMembers(sessionId),
        KEYS.sessionLeader(sessionId),
        connectionId,
        TTL.sessionMembership.toString(),
        TTL.sessionMembership.toString() // Use same TTL for leader key
      ) as string | null;

      // Result: null = wasn't leader, '' = was leader but no new leader, otherwise = new leader ID
      if (result === null) {
        // Wasn't leader, no election needed
        return { newLeaderId: null };
      }

      if (result === '') {
        // Was leader but no candidates for new leader
        console.log(`[DistributedState] Session ${sessionId.slice(0, 8)} has no remaining members after leader left`);
        return { newLeaderId: null };
      }

      // New leader elected
      console.log(`[DistributedState] Elected new leader: ${result.slice(0, 8)} for session ${sessionId.slice(0, 8)}`);
      return { newLeaderId: result };
    } catch (err) {
      console.error(`[DistributedState] Failed to leave session ${sessionId.slice(0, 8)}:`, err);
      // Fallback: try to clean up manually and handle leader election.
      // Note: This fallback has a potential race condition where leadership could change
      // between reading the leader and cleanup. This is acceptable because:
      // 1. This path only runs when the atomic LEAVE_SESSION_SCRIPT fails (rare)
      // 2. The worst case is we skip leader election when we should have done it
      // 3. The next joinSession will fix this by electing a leader if none exists
      // 4. Using another Lua script here would just fail again if Redis is having issues
      try {
        // Check if this connection was the leader before cleanup (non-atomic, best-effort)
        const currentLeader = await this.redis.get(KEYS.sessionLeader(sessionId));
        const wasLeader = currentLeader === connectionId;

        // Clean up the connection's session state
        const multi = this.redis.multi();
        multi.hmset(KEYS.connection(connectionId), { sessionId: '', isLeader: 'false' });
        multi.srem(KEYS.sessionMembers(sessionId), connectionId);
        await multi.exec();

        // If was leader, try to elect a new one (best-effort)
        if (wasLeader) {
          try {
            const newLeaderId = await this.redis.eval(
              ELECT_NEW_LEADER_SCRIPT,
              2,
              KEYS.sessionMembers(sessionId),
              KEYS.sessionLeader(sessionId),
              connectionId,
              TTL.sessionMembership.toString(),
              TTL.sessionMembership.toString()
            ) as string | null;

            if (newLeaderId) {
              console.log(`[DistributedState] Fallback: elected new leader ${newLeaderId.slice(0, 8)} for session ${sessionId.slice(0, 8)}`);
              return { newLeaderId };
            }
          } catch (electionErr) {
            console.error(`[DistributedState] Fallback leader election failed:`, electionErr);
            // Clear the leader key to allow next join to become leader
            await this.redis.del(KEYS.sessionLeader(sessionId)).catch(() => {});
          }
        }
      } catch {
        // Ignore fallback error
      }
      return { newLeaderId: null };
    }
  }

  /**
   * Get all members of a session as SessionUser objects.
   * This aggregates data from all instances.
   */
  async getSessionMembers(sessionId: string): Promise<SessionUser[]> {
    validateSessionId(sessionId);
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
    validateSessionId(sessionId);
    return this.redis.get(KEYS.sessionLeader(sessionId));
  }

  /**
   * Get count of members in a session.
   */
  async getSessionMemberCount(sessionId: string): Promise<number> {
    validateSessionId(sessionId);
    return this.redis.scard(KEYS.sessionMembers(sessionId));
  }

  /**
   * Update connection username.
   */
  async updateUsername(connectionId: string, username: string, avatarUrl?: string): Promise<void> {
    validateConnectionId(connectionId);
    const updates: Record<string, string> = { username };
    if (avatarUrl !== undefined) {
      updates.avatarUrl = avatarUrl || '';
    }
    await this.redis.hmset(KEYS.connection(connectionId), updates);
  }

  /**
   * Refresh connection TTL and session membership TTL atomically.
   * Uses a Lua script to avoid race conditions where the session might change
   * between reading the connection and refreshing TTLs.
   * @returns true if connection exists and was refreshed, false otherwise
   */
  async refreshConnection(connectionId: string): Promise<boolean> {
    validateConnectionId(connectionId);
    const result = await this.redis.eval(
      REFRESH_TTL_SCRIPT,
      1,
      KEYS.connection(connectionId),
      TTL.connection.toString(),
      TTL.sessionMembership.toString()
    ) as number;

    return result === 1;
  }

  /**
   * Refresh session membership TTL directly (for long-running sessions).
   */
  async refreshSessionMembership(sessionId: string): Promise<void> {
    validateSessionId(sessionId);
    await this.redis.expire(KEYS.sessionMembers(sessionId), TTL.sessionMembership);
  }

  /**
   * Check if session has any members.
   */
  async hasSessionMembers(sessionId: string): Promise<boolean> {
    validateSessionId(sessionId);
    const count = await this.redis.scard(KEYS.sessionMembers(sessionId));
    return count > 0;
  }

  /**
   * Clean up session state when it becomes empty.
   */
  async cleanupEmptySession(sessionId: string): Promise<void> {
    validateSessionId(sessionId);
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
   * Called on graceful shutdown. Uses parallel cleanup with Promise.allSettled.
   * removeConnection handles leader election automatically.
   */
  private async cleanupInstanceConnections(): Promise<void> {
    const connectionIds = await this.redis.smembers(KEYS.instanceConnections(this.instanceId));

    if (connectionIds.length === 0) {
      return;
    }

    // Use Promise.allSettled for parallel cleanup - faster than sequential
    const results = await Promise.allSettled(
      connectionIds.map((connectionId) => this.removeConnection(connectionId))
    );

    // Collect failed connection IDs
    const failedConnectionIds: string[] = [];
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'rejected') {
        console.error(
          `[DistributedState] Failed to remove connection ${connectionIds[i].slice(0, 8)} during cleanup:`,
          result.reason
        );
        failedConnectionIds.push(connectionIds[i]);
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
   * Note: Empty strings in Redis are treated as null/not set.
   * This is consistent with connectionToHash which converts null to empty string.
   */
  private hashToConnection(hash: Record<string, string>): DistributedConnection {
    // Empty string in Redis means "not set" - convert to null for consistency
    // This matches the pattern: null -> '' (storage) -> null (retrieval)
    const sessionId = hash.sessionId && hash.sessionId !== '' ? hash.sessionId : null;
    const userId = hash.userId && hash.userId !== '' ? hash.userId : null;
    const avatarUrl = hash.avatarUrl && hash.avatarUrl !== '' ? hash.avatarUrl : null;

    return {
      connectionId: hash.connectionId,
      instanceId: hash.instanceId,
      sessionId,
      userId,
      username: hash.username,
      avatarUrl,
      isLeader: hash.isLeader === 'true',
      connectedAt: parseInt(hash.connectedAt, 10) || Date.now(),
    };
  }
}

// Singleton instance - initialized when Redis is available
let distributedStateManager: DistributedStateManager | null = null;
// Track if we've already warned about re-initialization to avoid log spam during hot-reload
let hasWarnedAboutReinitialization = false;

/**
 * Initialize the distributed state manager.
 * Call this during server startup when Redis is available.
 */
export function initializeDistributedState(redis: Redis, instanceId?: string): DistributedStateManager {
  if (distributedStateManager) {
    // Only warn once to avoid log spam during development hot-reload
    if (!hasWarnedAboutReinitialization) {
      console.warn('[DistributedState] Already initialized, returning existing instance');
      hasWarnedAboutReinitialization = true;
    }
    return distributedStateManager;
  }

  distributedStateManager = new DistributedStateManager(redis, instanceId);
  hasWarnedAboutReinitialization = false; // Reset warning flag for new instance
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
    hasWarnedAboutReinitialization = false;
  }
}

/**
 * Reset the singleton state (for testing and hot-reload scenarios).
 * This stops the manager (clearing intervals and cleaning up connections) before clearing.
 * For synchronous reset without cleanup (e.g., after manual stop()), use forceResetDistributedState().
 */
export async function resetDistributedState(): Promise<void> {
  if (distributedStateManager) {
    await distributedStateManager.stop();
    distributedStateManager = null;
    hasWarnedAboutReinitialization = false;
  }
}

/**
 * Force reset the singleton state synchronously.
 * This clears the heartbeat interval to prevent memory leaks, but does NOT
 * clean up Redis state (connections, sessions). Use this in tests where
 * Redis cleanup is handled separately, or when you need a synchronous reset.
 *
 * For proper cleanup including Redis state, use shutdownDistributedState() instead.
 */
export function forceResetDistributedState(): void {
  if (distributedStateManager) {
    // Check if stop() was already called by checking if heartbeat is cleared
    if (!distributedStateManager.isStopped()) {
      console.warn(
        '[DistributedState] Force resetting without prior stop() - ' +
          'clearing heartbeat interval but Redis state may be orphaned'
      );
      // Clear the heartbeat interval to prevent memory leak
      distributedStateManager.stopHeartbeat();
    }
  }
  distributedStateManager = null;
  hasWarnedAboutReinitialization = false;
}
