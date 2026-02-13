import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createQueryWrapper } from '@/app/test-utils/test-providers';

vi.mock('../use-ws-auth-token', () => ({
  useWsAuthToken: vi.fn(),
}));

vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
}));

const mockRequest = vi.fn();
vi.mock('@/app/lib/graphql/client', () => ({
  createGraphQLHttpClient: () => ({ request: mockRequest }),
}));

vi.mock('@/app/lib/graphql/operations', () => ({
  GET_TICKS: 'GET_TICKS_QUERY',
}));

import { useWsAuthToken } from '../use-ws-auth-token';
import { useSession } from 'next-auth/react';
import { useLogbook, useInvalidateLogbook, logbookQueryKey } from '../use-logbook';

const mockUseWsAuthToken = vi.mocked(useWsAuthToken);
const mockUseSession = vi.mocked(useSession);

describe('useLogbook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseWsAuthToken.mockReturnValue({
      token: 'test-token',
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });
    mockUseSession.mockReturnValue({
      status: 'authenticated',
      data: { user: { id: '1' }, expires: '' },
      update: vi.fn(),
    });
    mockRequest.mockReset();
  });

  it('returns empty logbook when disabled (no session)', async () => {
    mockUseSession.mockReturnValue({
      status: 'unauthenticated',
      data: null,
      update: vi.fn(),
    });

    const { result } = renderHook(
      () => useLogbook('kilter', ['uuid-1']),
      { wrapper: createQueryWrapper() },
    );

    // Query should not execute
    expect(result.current.logbook).toEqual([]);
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('returns empty logbook when no token', async () => {
    mockUseWsAuthToken.mockReturnValue({
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(
      () => useLogbook('kilter', ['uuid-1']),
      { wrapper: createQueryWrapper() },
    );

    expect(result.current.logbook).toEqual([]);
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('returns empty logbook when empty climbUuids', async () => {
    const { result } = renderHook(
      () => useLogbook('kilter', []),
      { wrapper: createQueryWrapper() },
    );

    expect(result.current.logbook).toEqual([]);
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('fetches and transforms ticks when enabled', async () => {
    mockRequest.mockResolvedValue({
      ticks: [
        {
          uuid: 'tick-1',
          climbUuid: 'climb-1',
          angle: 40,
          isMirror: false,
          attemptCount: 3,
          quality: 4,
          difficulty: 10,
          isBenchmark: false,
          comment: 'Nice climb',
          climbedAt: '2024-01-01',
          createdAt: '2024-01-01T10:00:00Z',
          updatedAt: '2024-01-01T10:00:00Z',
          status: 'send',
          auroraId: null,
        },
      ],
    });

    const { result } = renderHook(
      () => useLogbook('kilter', ['climb-1']),
      { wrapper: createQueryWrapper() },
    );

    await waitFor(() => {
      expect(result.current.logbook.length).toBe(1);
    });

    expect(result.current.logbook[0]).toEqual({
      uuid: 'tick-1',
      climb_uuid: 'climb-1',
      angle: 40,
      is_mirror: false,
      user_id: 0,
      attempt_id: 0,
      tries: 3,
      quality: 4,
      difficulty: 10,
      is_benchmark: false,
      is_listed: true,
      comment: 'Nice climb',
      climbed_at: '2024-01-01',
      created_at: '2024-01-01T10:00:00Z',
      updated_at: '2024-01-01T10:00:00Z',
      wall_uuid: null,
      is_ascent: true,
      status: 'send',
      aurora_synced: false,
    });
  });

  it('transformTicks maps fields correctly', async () => {
    mockRequest.mockResolvedValue({
      ticks: [
        {
          uuid: 'tick-2',
          climbUuid: 'climb-2',
          angle: 20,
          isMirror: true,
          attemptCount: 1,
          quality: null,
          difficulty: null,
          isBenchmark: true,
          comment: '',
          climbedAt: '2024-06-15',
          createdAt: '2024-06-15T12:00:00Z',
          updatedAt: '2024-06-15T12:00:00Z',
          status: 'flash',
          auroraId: 'aurora-123',
        },
      ],
    });

    const { result } = renderHook(
      () => useLogbook('tension', ['climb-2']),
      { wrapper: createQueryWrapper() },
    );

    await waitFor(() => {
      expect(result.current.logbook.length).toBe(1);
    });

    const entry = result.current.logbook[0];
    expect(entry.is_mirror).toBe(true);
    expect(entry.is_benchmark).toBe(true);
    expect(entry.quality).toBeNull();
    expect(entry.difficulty).toBeNull();
    expect(entry.aurora_synced).toBe(true);
    expect(entry.is_ascent).toBe(true);
    expect(entry.status).toBe('flash');
  });

  it('logbookQueryKey sorts climbUuids for stability', () => {
    const key1 = logbookQueryKey('kilter', ['c', 'a', 'b']);
    const key2 = logbookQueryKey('kilter', ['b', 'a', 'c']);

    expect(key1).toEqual(key2);
    expect(key1[2]).toBe('a,b,c');
  });

  it('handles loading state', () => {
    mockRequest.mockReturnValue(new Promise(() => {})); // never resolves

    const { result } = renderHook(
      () => useLogbook('kilter', ['climb-1']),
      { wrapper: createQueryWrapper() },
    );

    expect(result.current.isLoading).toBe(true);
  });

  it('query key includes boardName and sorted UUIDs', () => {
    const key = logbookQueryKey('tension', ['z-uuid', 'a-uuid']);
    expect(key[0]).toBe('logbook');
    expect(key[1]).toBe('tension');
    expect(key[2]).toBe('a-uuid,z-uuid');
  });

  it('is_ascent is true for flash/send, false for attempt', async () => {
    mockRequest.mockResolvedValue({
      ticks: [
        {
          uuid: 'tick-flash',
          climbUuid: 'climb-1',
          angle: 30,
          isMirror: false,
          attemptCount: 1,
          quality: null,
          difficulty: null,
          isBenchmark: false,
          comment: '',
          climbedAt: '2024-01-01',
          createdAt: '2024-01-01T10:00:00Z',
          updatedAt: '2024-01-01T10:00:00Z',
          status: 'flash',
          auroraId: null,
        },
        {
          uuid: 'tick-send',
          climbUuid: 'climb-1',
          angle: 30,
          isMirror: false,
          attemptCount: 5,
          quality: null,
          difficulty: null,
          isBenchmark: false,
          comment: '',
          climbedAt: '2024-01-02',
          createdAt: '2024-01-02T10:00:00Z',
          updatedAt: '2024-01-02T10:00:00Z',
          status: 'send',
          auroraId: null,
        },
        {
          uuid: 'tick-attempt',
          climbUuid: 'climb-1',
          angle: 30,
          isMirror: false,
          attemptCount: 2,
          quality: null,
          difficulty: null,
          isBenchmark: false,
          comment: '',
          climbedAt: '2024-01-03',
          createdAt: '2024-01-03T10:00:00Z',
          updatedAt: '2024-01-03T10:00:00Z',
          status: 'attempt',
          auroraId: null,
        },
      ],
    });

    const { result } = renderHook(
      () => useLogbook('kilter', ['climb-1']),
      { wrapper: createQueryWrapper() },
    );

    await waitFor(() => {
      expect(result.current.logbook.length).toBe(3);
    });

    expect(result.current.logbook[0].is_ascent).toBe(true); // flash
    expect(result.current.logbook[1].is_ascent).toBe(true); // send
    expect(result.current.logbook[2].is_ascent).toBe(false); // attempt
  });
});

describe('useInvalidateLogbook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a function', () => {
    const { result } = renderHook(
      () => useInvalidateLogbook('kilter'),
      { wrapper: createQueryWrapper() },
    );

    expect(typeof result.current).toBe('function');
  });
});
