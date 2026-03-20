import type Redis from 'ioredis';
import { KEYS, TTL, validateSessionId } from './constants';
import { LEADER_ELECTION_SCRIPT } from './lua-scripts';

/**
 * Attempt to elect a connection as leader for a session.
 * Only succeeds if no leader currently exists.
 * Returns true if this connection became leader.
 */
export async function tryElectLeader(
  redis: Redis,
  connectionId: string,
  sessionId: string
): Promise<boolean> {
  validateSessionId(sessionId);

  const result = (await redis.eval(
    LEADER_ELECTION_SCRIPT,
    2,
    KEYS.sessionLeader(sessionId),
    KEYS.connection(connectionId),
    connectionId,
    TTL.sessionMembership.toString()
  )) as number;

  return result === 1;
}
