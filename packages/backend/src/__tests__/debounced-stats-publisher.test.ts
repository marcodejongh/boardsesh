import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// --- Hoisted mocks ---
const { buildSessionStatsUpdatedEventMock, publishSessionEventMock, redisSetMock, redisGetMock, redisDelMock } = vi.hoisted(() => ({
  buildSessionStatsUpdatedEventMock: vi.fn(),
  publishSessionEventMock: vi.fn(),
  redisSetMock: vi.fn().mockResolvedValue('OK'),
  redisGetMock: vi.fn(),
  redisDelMock: vi.fn().mockResolvedValue(1),
}));

let mockRedisConnected = true;

vi.mock('../graphql/resolvers/sessions/live-session-stats', () => ({
  buildSessionStatsUpdatedEvent: buildSessionStatsUpdatedEventMock,
}));

vi.mock('../pubsub/index', () => ({
  pubsub: {
    publishSessionEvent: publishSessionEventMock,
  },
}));

vi.mock('../redis/client', () => ({
  redisClientManager: {
    isRedisConnected: () => mockRedisConnected,
    getClients: () => ({
      publisher: {
        set: redisSetMock,
        get: redisGetMock,
        del: redisDelMock,
      },
    }),
  },
}));

import { publishDebouncedSessionStats } from '../graphql/resolvers/sessions/debounced-stats-publisher';

describe('publishDebouncedSessionStats', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockRedisConnected = true;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('publishes after debounce delay', async () => {
    const event = { __typename: 'SessionStatsUpdated', sessionId: 's1' };
    buildSessionStatsUpdatedEventMock.mockResolvedValue(event);
    // Redis GET returns our nonce (simulate being the last writer)
    redisGetMock.mockImplementation(async () => {
      // Return the nonce that was written by SET
      const setCall = redisSetMock.mock.calls[0];
      return setCall?.[1] ?? null;
    });

    publishDebouncedSessionStats('s1');

    // Should not publish immediately
    expect(buildSessionStatsUpdatedEventMock).not.toHaveBeenCalled();

    // Advance past debounce window
    await vi.advanceTimersByTimeAsync(2100);

    expect(buildSessionStatsUpdatedEventMock).toHaveBeenCalledWith('s1');
    expect(publishSessionEventMock).toHaveBeenCalledWith('s1', event);
  });

  it('resets timer when called multiple times for same session', async () => {
    const event = { __typename: 'SessionStatsUpdated', sessionId: 's1' };
    buildSessionStatsUpdatedEventMock.mockResolvedValue(event);
    redisGetMock.mockImplementation(async () => {
      // Return the nonce from the most recent SET call
      const calls = redisSetMock.mock.calls;
      return calls[calls.length - 1]?.[1] ?? null;
    });

    publishDebouncedSessionStats('s1');
    await vi.advanceTimersByTimeAsync(1000);

    // Call again — should reset the timer
    publishDebouncedSessionStats('s1');
    await vi.advanceTimersByTimeAsync(1000);

    // Only 1s since the second call — should not have published yet
    expect(buildSessionStatsUpdatedEventMock).not.toHaveBeenCalled();

    // Advance past the second debounce window
    await vi.advanceTimersByTimeAsync(1100);

    expect(buildSessionStatsUpdatedEventMock).toHaveBeenCalledTimes(1);
  });

  it('skips publish when Redis nonce does not match (another instance won)', async () => {
    redisGetMock.mockResolvedValue('different-nonce');

    publishDebouncedSessionStats('s1');
    await vi.advanceTimersByTimeAsync(2100);

    expect(buildSessionStatsUpdatedEventMock).not.toHaveBeenCalled();
    expect(publishSessionEventMock).not.toHaveBeenCalled();
  });

  it('writes nonce to Redis with SET PX on each call', () => {
    publishDebouncedSessionStats('s1');

    expect(redisSetMock).toHaveBeenCalledWith(
      'boardsesh:debounce:stats:s1',
      expect.any(String),
      'PX',
      2500,
    );
  });

  it('cleans up Redis key after successful publish', async () => {
    const event = { __typename: 'SessionStatsUpdated', sessionId: 's1' };
    buildSessionStatsUpdatedEventMock.mockResolvedValue(event);
    redisGetMock.mockImplementation(async () => {
      const setCall = redisSetMock.mock.calls[0];
      return setCall?.[1] ?? null;
    });

    publishDebouncedSessionStats('s1');
    await vi.advanceTimersByTimeAsync(2100);

    expect(redisDelMock).toHaveBeenCalledWith('boardsesh:debounce:stats:s1');
  });

  it('falls back to local-only debounce when Redis is not connected', async () => {
    mockRedisConnected = false;
    const event = { __typename: 'SessionStatsUpdated', sessionId: 's1' };
    buildSessionStatsUpdatedEventMock.mockResolvedValue(event);

    publishDebouncedSessionStats('s1');
    await vi.advanceTimersByTimeAsync(2100);

    // Should publish without Redis checks
    expect(redisSetMock).not.toHaveBeenCalled();
    expect(redisGetMock).not.toHaveBeenCalled();
    expect(buildSessionStatsUpdatedEventMock).toHaveBeenCalledWith('s1');
    expect(publishSessionEventMock).toHaveBeenCalledWith('s1', event);
  });

  it('logs error when buildSessionStatsUpdatedEvent throws', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    buildSessionStatsUpdatedEventMock.mockRejectedValue(new Error('DB connection lost'));
    redisGetMock.mockImplementation(async () => {
      const setCall = redisSetMock.mock.calls[0];
      return setCall?.[1] ?? null;
    });

    publishDebouncedSessionStats('s1');
    await vi.advanceTimersByTimeAsync(2100);

    expect(buildSessionStatsUpdatedEventMock).toHaveBeenCalledWith('s1');
    expect(publishSessionEventMock).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to publish SessionStatsUpdated for session s1'),
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });

  it('publishes anyway when Redis GET fails (fail-open)', async () => {
    const event = { __typename: 'SessionStatsUpdated', sessionId: 's1' };
    buildSessionStatsUpdatedEventMock.mockResolvedValue(event);
    redisGetMock.mockRejectedValue(new Error('Redis connection lost'));

    publishDebouncedSessionStats('s1');
    await vi.advanceTimersByTimeAsync(2100);

    // Should still publish — better duplicate than drop
    expect(buildSessionStatsUpdatedEventMock).toHaveBeenCalledWith('s1');
    expect(publishSessionEventMock).toHaveBeenCalledWith('s1', event);
  });
});
