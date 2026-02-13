import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Use vi.hoisted() so mock variables are available when vi.mock factories run
const { mockIncr, mockExpire, mockIsRedisConnected, mockCheckRateLimit } = vi.hoisted(() => ({
  mockIncr: vi.fn(),
  mockExpire: vi.fn(),
  mockIsRedisConnected: vi.fn(),
  mockCheckRateLimit: vi.fn(),
}));

vi.mock('../redis/client', () => ({
  redisClientManager: {
    isRedisConnected: mockIsRedisConnected,
    getClients: () => ({
      publisher: {
        incr: mockIncr,
        expire: mockExpire,
      },
    }),
  },
}));

vi.mock('../utils/rate-limiter', () => ({
  checkRateLimit: mockCheckRateLimit,
}));

import { checkRateLimitRedis } from '../utils/redis-rate-limiter';

describe('checkRateLimitRedis', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('when Redis is connected', () => {
    beforeEach(() => {
      mockIsRedisConnected.mockReturnValue(true);
    });

    it('increments the rate limit key in Redis', async () => {
      mockIncr.mockResolvedValue(1);
      mockExpire.mockResolvedValue(1);

      await checkRateLimitRedis('user-1', 'vote', 30, 60_000);

      expect(mockIncr).toHaveBeenCalledOnce();
      const key = mockIncr.mock.calls[0][0];
      expect(key).toContain('ratelimit:');
      expect(key).toContain('user-1');
      expect(key).toContain('vote');
    });

    it('sets expire on first request in window (count === 1)', async () => {
      mockIncr.mockResolvedValue(1);
      mockExpire.mockResolvedValue(1);

      await checkRateLimitRedis('user-1', 'vote', 30, 60_000);

      expect(mockExpire).toHaveBeenCalledOnce();
      // expire should be ceil(60000 / 1000) = 60 seconds
      expect(mockExpire.mock.calls[0][1]).toBe(60);
    });

    it('does not set expire on subsequent requests (count > 1)', async () => {
      mockIncr.mockResolvedValue(5);

      await checkRateLimitRedis('user-1', 'vote', 30, 60_000);

      expect(mockExpire).not.toHaveBeenCalled();
    });

    it('allows requests within the limit', async () => {
      mockIncr.mockResolvedValue(30); // exactly at limit

      await expect(
        checkRateLimitRedis('user-1', 'vote', 30, 60_000),
      ).resolves.toBeUndefined();
    });

    it('throws when rate limit is exceeded', async () => {
      mockIncr.mockResolvedValue(31); // over limit of 30

      await expect(
        checkRateLimitRedis('user-1', 'vote', 30, 60_000),
      ).rejects.toThrow('Rate limit exceeded');
    });

    it('uses correct window bucket based on current time', async () => {
      mockIncr.mockResolvedValue(1);
      mockExpire.mockResolvedValue(1);

      await checkRateLimitRedis('user-1', 'vote', 30, 60_000);

      const key = mockIncr.mock.calls[0][0];
      const expectedBucket = Math.floor(Date.now() / 60_000);
      expect(key).toBe(`ratelimit:user-1:vote:${expectedBucket}`);
    });

    it('uses different keys for different operations', async () => {
      mockIncr.mockResolvedValue(1);
      mockExpire.mockResolvedValue(1);

      await checkRateLimitRedis('user-1', 'vote', 30, 60_000);
      await checkRateLimitRedis('user-1', 'comment', 10, 60_000);

      const key1 = mockIncr.mock.calls[0][0];
      const key2 = mockIncr.mock.calls[1][0];
      expect(key1).toContain('vote');
      expect(key2).toContain('comment');
      expect(key1).not.toBe(key2);
    });

    it('uses different keys for different users', async () => {
      mockIncr.mockResolvedValue(1);
      mockExpire.mockResolvedValue(1);

      await checkRateLimitRedis('user-1', 'vote', 30, 60_000);
      await checkRateLimitRedis('user-2', 'vote', 30, 60_000);

      const key1 = mockIncr.mock.calls[0][0];
      const key2 = mockIncr.mock.calls[1][0];
      expect(key1).toContain('user-1');
      expect(key2).toContain('user-2');
      expect(key1).not.toBe(key2);
    });
  });

  describe('when Redis is not connected', () => {
    beforeEach(() => {
      mockIsRedisConnected.mockReturnValue(false);
    });

    it('falls back to in-memory rate limiter', async () => {
      await checkRateLimitRedis('user-1', 'vote', 30, 60_000);

      expect(mockIncr).not.toHaveBeenCalled();
      expect(mockCheckRateLimit).toHaveBeenCalledWith('user-1:vote', 30, 60_000);
    });

    it('re-throws in-memory rate limit errors', async () => {
      mockCheckRateLimit.mockImplementation(() => {
        throw new Error('Rate limit exceeded. Try again in 30 seconds.');
      });

      await expect(
        checkRateLimitRedis('user-1', 'vote', 30, 60_000),
      ).rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('when Redis throws a connection error', () => {
    beforeEach(() => {
      mockIsRedisConnected.mockReturnValue(true);
    });

    it('falls back to in-memory rate limiter on Redis error', async () => {
      mockIncr.mockRejectedValue(new Error('ECONNREFUSED'));

      await checkRateLimitRedis('user-1', 'vote', 30, 60_000);

      expect(mockCheckRateLimit).toHaveBeenCalledWith('user-1:vote', 30, 60_000);
    });

    it('re-throws rate limit errors even when Redis has issues', async () => {
      mockIncr.mockRejectedValue(new Error('Rate limit exceeded. Try again in 30 seconds.'));

      await expect(
        checkRateLimitRedis('user-1', 'vote', 30, 60_000),
      ).rejects.toThrow('Rate limit exceeded');
    });

    it('does not re-throw non-rate-limit errors', async () => {
      mockIncr.mockRejectedValue(new Error('Redis cluster timeout'));

      // Should not throw — falls back to in-memory
      await expect(
        checkRateLimitRedis('user-1', 'vote', 30, 60_000),
      ).resolves.toBeUndefined();
    });
  });
});
