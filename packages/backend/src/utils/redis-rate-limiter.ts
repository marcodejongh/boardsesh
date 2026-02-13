import { redisClientManager } from '../redis/client';
import { checkRateLimit } from './rate-limiter';

/**
 * Distributed rate limiter using Redis INCR + EXPIRE.
 * Falls back to in-memory rate limiter if Redis is unavailable.
 *
 * Key format: ratelimit:{userId}:{operation}:{windowBucket}
 * where windowBucket = Math.floor(Date.now() / windowMs)
 */
export async function checkRateLimitRedis(
  userId: string,
  operation: string,
  maxRequests: number,
  windowMs: number,
): Promise<void> {
  // If Redis is not connected, fall back to in-memory
  if (!redisClientManager.isRedisConnected()) {
    // Fall back to in-memory rate limiter using a combined key
    checkRateLimit(`${userId}:${operation}`, maxRequests, windowMs);
    return;
  }

  try {
    const { publisher } = redisClientManager.getClients();
    const windowBucket = Math.floor(Date.now() / windowMs);
    const key = `ratelimit:${userId}:${operation}:${windowBucket}`;
    const expireSeconds = Math.ceil(windowMs / 1000);

    // Atomic INCR + EXPIRE
    const count = await publisher.incr(key);
    if (count === 1) {
      // First request in this window — set expiry
      await publisher.expire(key, expireSeconds);
    }

    if (count > maxRequests) {
      const retryAfterSeconds = Math.ceil(
        (windowMs - (Date.now() % windowMs)) / 1000,
      );
      throw new Error(
        `Rate limit exceeded. Try again in ${retryAfterSeconds} seconds.`,
      );
    }
  } catch (err) {
    // If the error is our rate limit error, re-throw it
    if (err instanceof Error && err.message.startsWith('Rate limit exceeded')) {
      throw err;
    }
    // Otherwise Redis failed — fall back to in-memory
    console.warn('[RateLimit] Redis unavailable, falling back to in-memory:', (err as Error).message);
    checkRateLimit(`${userId}:${operation}`, maxRequests, windowMs);
  }
}
