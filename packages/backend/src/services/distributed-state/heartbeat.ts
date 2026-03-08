import type Redis from 'ioredis';
import { KEYS, TTL } from './constants';
import { cleanupStaleSessionMembers } from './session-ops';
import { removeConnection, getConnection } from './connection-ops';

/**
 * Update instance heartbeat in Redis.
 */
export async function updateHeartbeat(redis: Redis, instanceId: string): Promise<void> {
  const multi = redis.multi();
  multi.setex(KEYS.instanceHeartbeat(instanceId), TTL.instanceHeartbeat, Date.now().toString());
  // Keep instance connection-set alive as long as the instance is running.
  // Without this, the 2h TTL set at registerConnection() would expire for
  // long-lived instances with no new connections, making them invisible
  // to discoverDeadInstances() after a crash.
  multi.expire(KEYS.instanceConnections(instanceId), 2 * 60 * 60); // 2 hours
  await multi.exec();
}

/**
 * Discover instance IDs whose heartbeat has expired (dead instances).
 * Scans for `boardsesh:instance:*:conns` keys and checks whether the
 * corresponding heartbeat key still exists. Skips the current instance.
 */
export async function discoverDeadInstances(redis: Redis, instanceId: string): Promise<string[]> {
  const deadInstances: string[] = [];
  let cursor = '0';
  const pattern = 'boardsesh:instance:*:conns';

  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = nextCursor;

    for (const key of keys) {
      // Extract instance ID from key: boardsesh:instance:<ID>:conns
      const match = key.match(/^boardsesh:instance:(.+):conns$/);
      if (!match) continue;

      const foundInstanceId = match[1];
      if (foundInstanceId === instanceId) continue; // Skip self

      const heartbeatExists = await redis.exists(KEYS.instanceHeartbeat(foundInstanceId));
      if (!heartbeatExists) {
        deadInstances.push(foundInstanceId);
      }
    }
  } while (cursor !== '0');

  return deadInstances;
}

/**
 * Clean up connections from dead backend instances.
 * For each dead instance: gets its connections, groups by session,
 * prunes stale members per session, and deletes instance tracking keys.
 */
export async function cleanupDeadInstanceConnections(
  redis: Redis,
  instanceId: string
): Promise<{
  deadInstances: string[];
  staleConnections: string[];
  sessionsAffected: string[];
}> {
  const deadInstances = await discoverDeadInstances(redis, instanceId);
  if (deadInstances.length === 0) {
    return { deadInstances: [], staleConnections: [], sessionsAffected: [] };
  }

  console.log(
    `[DistributedState] Found ${deadInstances.length} dead instances: ${deadInstances.map((id) => id.slice(0, 8)).join(', ')}`
  );

  const allStaleConnections: string[] = [];
  const allSessionsAffected = new Set<string>();

  for (const deadInstanceId of deadInstances) {
    const connectionIds = await redis.smembers(KEYS.instanceConnections(deadInstanceId));
    if (connectionIds.length === 0) {
      // No connections, just clean up the tracking key
      await redis.del(KEYS.instanceConnections(deadInstanceId));
      continue;
    }

    console.log(
      `[DistributedState] Dead instance ${deadInstanceId.slice(0, 8)} has ${connectionIds.length} orphaned connections`
    );

    // Group connections by session for batch pruning
    const sessionConnections = new Map<string, string[]>();
    const pipeline = redis.pipeline();
    for (const connId of connectionIds) {
      pipeline.hget(KEYS.connection(connId), 'sessionId');
    }
    const results = await pipeline.exec();

    if (results) {
      for (let i = 0; i < connectionIds.length; i++) {
        const [err, sessionId] = results[i] as [Error | null, string | null];
        if (!err && sessionId && sessionId !== '') {
          const conns = sessionConnections.get(sessionId) || [];
          conns.push(connectionIds[i]);
          sessionConnections.set(sessionId, conns);
        }
      }
    }

    // Delete all connection hashes for this dead instance
    const delPipeline = redis.pipeline();
    for (const connId of connectionIds) {
      delPipeline.del(KEYS.connection(connId));
    }
    // Delete the instance tracking keys
    delPipeline.del(KEYS.instanceConnections(deadInstanceId));
    await delPipeline.exec();

    allStaleConnections.push(...connectionIds);

    // Prune stale members from each affected session
    for (const sessionId of sessionConnections.keys()) {
      allSessionsAffected.add(sessionId);
      try {
        await cleanupStaleSessionMembers(redis, sessionId);
      } catch (err) {
        console.error(
          `[DistributedState] Failed to prune session ${sessionId.slice(0, 8)}:`,
          err
        );
      }
    }
  }

  console.log(
    `[DistributedState] Cleanup complete: removed ${allStaleConnections.length} stale connections ` +
      `from ${deadInstances.length} dead instances affecting ${allSessionsAffected.size} sessions`
  );

  return {
    deadInstances,
    staleConnections: allStaleConnections,
    sessionsAffected: Array.from(allSessionsAffected),
  };
}

/**
 * Clean up all connections belonging to an instance.
 * Called on graceful shutdown. Uses parallel cleanup with Promise.allSettled.
 */
export async function cleanupInstanceConnections(
  redis: Redis,
  instanceId: string
): Promise<void> {
  const connectionIds = await redis.smembers(KEYS.instanceConnections(instanceId));

  if (connectionIds.length === 0) {
    return;
  }

  // Use Promise.allSettled for parallel cleanup - faster than sequential
  const results = await Promise.allSettled(
    connectionIds.map((connectionId) => removeConnection(redis, instanceId, connectionId))
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
    console.warn(
      `[DistributedState] Force cleaning ${failedConnectionIds.length} failed connections`
    );
    const cleanupMulti = redis.multi();
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
  const multi = redis.multi();
  multi.del(KEYS.instanceConnections(instanceId));
  multi.del(KEYS.instanceHeartbeat(instanceId));
  await multi.exec();

  console.log(
    `[DistributedState] Cleaned up ${connectionIds.length} connections for instance: ${instanceId.slice(0, 8)}`
  );
}
