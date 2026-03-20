import { randomUUID } from 'crypto';
import { buildSessionStatsUpdatedEvent } from './live-session-stats';
import { pubsub } from '../../../pubsub/index';
import { redisClientManager } from '../../../redis/client';

const DEBOUNCE_MS = 2000;
const REDIS_KEY_PREFIX = 'boardsesh:debounce:stats:';

/**
 * Local timers used to schedule the publish after the debounce window.
 * In multi-instance deployments the Redis key decides which instance
 * actually publishes — the timer just provides the delay.
 */
const pending = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Debounced wrapper around buildSessionStatsUpdatedEvent + publish.
 *
 * When multiple ticks are saved in quick succession for the same session
 * (e.g. bulk imports, rapid logging) this collapses them into a single
 * stats fetch + broadcast, reducing database load and WS payload volume.
 *
 * With horizontal scaling the debounce is coordinated via Redis:
 *   1. Each call writes a unique nonce to a Redis key with a 2s TTL.
 *   2. A local timer fires after 2s and checks if the nonce still matches.
 *   3. Only the instance that wrote the *last* nonce actually publishes.
 *
 * Falls back to local-only debounce when Redis is not available.
 */
export function publishDebouncedSessionStats(sessionId: string): void {
  const existing = pending.get(sessionId);
  if (existing) {
    clearTimeout(existing);
  }

  const nonce = randomUUID();
  const redisKey = `${REDIS_KEY_PREFIX}${sessionId}`;

  // Try to write our nonce to Redis (non-blocking, best-effort).
  // SET key value PX ms — always overwrites, so the last caller wins.
  if (redisClientManager.isRedisConnected()) {
    const { publisher } = redisClientManager.getClients();
    publisher.set(redisKey, nonce, 'PX', DEBOUNCE_MS + 500).catch((err) => {
      console.error(`[debouncedStats] Redis SET failed for ${sessionId}:`, err);
    });
  }

  pending.set(
    sessionId,
    setTimeout(async () => {
      pending.delete(sessionId);

      // In Redis mode, only publish if our nonce is still current
      // (meaning no other instance received a newer tick for this session).
      if (redisClientManager.isRedisConnected()) {
        try {
          const { publisher } = redisClientManager.getClients();
          const current = await publisher.get(redisKey);
          if (current !== nonce) {
            // Another instance took over — skip publishing.
            return;
          }
          // Clean up the key now that we're publishing.
          await publisher.del(redisKey);
        } catch (err) {
          console.error(`[debouncedStats] Redis GET failed for ${sessionId}, publishing anyway:`, err);
          // Fall through to publish — better to duplicate than to drop.
        }
      }

      try {
        const event = await buildSessionStatsUpdatedEvent(sessionId);
        if (event) {
          pubsub.publishSessionEvent(sessionId, event);
        }
      } catch (error) {
        console.error(
          `[debouncedStats] Failed to publish SessionStatsUpdated for session ${sessionId}:`,
          error,
        );
      }
    }, DEBOUNCE_MS),
  );
}
