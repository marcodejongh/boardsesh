import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useIncrementalQuery } from '../use-incremental-query';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, retryDelay: 0, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });
}

function createWrapper(queryClient?: QueryClient) {
  const qc = queryClient ?? createTestQueryClient();
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'QueryClientWrapper';
  return { wrapper: Wrapper, queryClient: qc };
}

// Set-based helpers for testing
const mergeSet = (a: Set<string>, b: Set<string>) => new Set([...a, ...b]);
const hasSetChanged = (a: Set<string>, b: Set<string>) => a.size !== b.size;
const EMPTY_SET = new Set<string>();

describe('useIncrementalQuery', () => {
  let mockFetchChunk: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetchChunk = vi.fn();
  });

  const defaultOptions = (overrides = {}) => ({
    accumulatedKey: ['test', 'accumulated'] as const,
    fetchKeyPrefix: ['test', 'fetch'] as const,
    enabled: true,
    fetchChunk: mockFetchChunk,
    merge: mergeSet,
    initialValue: EMPTY_SET,
    hasChanged: hasSetChanged,
    ...overrides,
  });

  it('fetches data for provided UUIDs', async () => {
    mockFetchChunk.mockResolvedValueOnce(new Set(['a']));
    const { wrapper } = createWrapper();

    const { result } = renderHook(
      () => useIncrementalQuery(['a', 'b'], defaultOptions()),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.data.has('a')).toBe(true);
    });
    expect(mockFetchChunk).toHaveBeenCalledTimes(1);
    expect(mockFetchChunk).toHaveBeenCalledWith(['a', 'b']);
  });

  it('returns initialValue and isLoading=false when disabled', () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () => useIncrementalQuery(['a'], defaultOptions({ enabled: false })),
      { wrapper },
    );

    expect(result.current.data.size).toBe(0);
    expect(result.current.isLoading).toBe(false);
    expect(mockFetchChunk).not.toHaveBeenCalled();
  });

  it('does not fetch when UUIDs array is empty', () => {
    const { wrapper } = createWrapper();
    renderHook(
      () => useIncrementalQuery([], defaultOptions()),
      { wrapper },
    );

    expect(mockFetchChunk).not.toHaveBeenCalled();
  });

  it('incrementally fetches only new UUIDs', async () => {
    mockFetchChunk.mockResolvedValueOnce(new Set(['a']));
    const { wrapper } = createWrapper();

    const { result, rerender } = renderHook(
      ({ uuids }) => useIncrementalQuery(uuids, defaultOptions()),
      { wrapper, initialProps: { uuids: ['a', 'b'] } },
    );

    await waitFor(() => {
      expect(result.current.data.has('a')).toBe(true);
    });
    expect(mockFetchChunk).toHaveBeenCalledTimes(1);

    // Add a new UUID — only 'c' should be fetched
    mockFetchChunk.mockResolvedValueOnce(new Set(['c']));
    rerender({ uuids: ['a', 'b', 'c'] });

    await waitFor(() => {
      expect(result.current.data.has('c')).toBe(true);
    });
    expect(mockFetchChunk).toHaveBeenCalledTimes(2);
    expect(mockFetchChunk).toHaveBeenLastCalledWith(['c']);

    // Original data still present
    expect(result.current.data.has('a')).toBe(true);
  });

  it('does not refetch already-fetched UUIDs when reordered', async () => {
    mockFetchChunk.mockResolvedValueOnce(new Set(['a']));
    const { wrapper } = createWrapper();

    const { result, rerender } = renderHook(
      ({ uuids }) => useIncrementalQuery(uuids, defaultOptions()),
      { wrapper, initialProps: { uuids: ['b', 'a'] } },
    );

    await waitFor(() => {
      expect(result.current.data.size).toBe(1);
    });
    const callCount = mockFetchChunk.mock.calls.length;

    // Same UUIDs, different order
    rerender({ uuids: ['a', 'b'] });

    // Should not trigger a new fetch
    await waitFor(() => {
      expect(mockFetchChunk.mock.calls.length).toBe(callCount);
    });
  });

  it('chunks large UUID arrays into parallel requests', async () => {
    // Create 600 UUIDs — should produce 2 chunks (500 + 100)
    const uuids = Array.from({ length: 600 }, (_, i) => `uuid-${i}`);
    mockFetchChunk
      .mockResolvedValueOnce(new Set(['uuid-0']))
      .mockResolvedValueOnce(new Set(['uuid-500']));

    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () => useIncrementalQuery(uuids, defaultOptions({ chunkSize: 500 })),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.data.has('uuid-0')).toBe(true);
      expect(result.current.data.has('uuid-500')).toBe(true);
    });

    // Should have been called with two chunks
    expect(mockFetchChunk).toHaveBeenCalledTimes(2);
    expect(mockFetchChunk.mock.calls[0][0]).toHaveLength(500);
    expect(mockFetchChunk.mock.calls[1][0]).toHaveLength(100);
  });

  it('handles chunk failure gracefully (React Query manages error state)', async () => {
    mockFetchChunk.mockRejectedValueOnce(new Error('Network error'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () => useIncrementalQuery(['a'], defaultOptions()),
      { wrapper },
    );

    // Data stays at initial value, isLoading eventually goes false
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.data.size).toBe(0);

    vi.restoreAllMocks();
  });

  it('handles partial chunk failure (all-or-nothing per batch)', async () => {
    // With 2 chunks, if Promise.all rejects (one chunk fails), the entire batch fails
    const uuids = Array.from({ length: 600 }, (_, i) => `uuid-${i}`);
    mockFetchChunk
      .mockResolvedValueOnce(new Set(['uuid-0']))
      .mockRejectedValueOnce(new Error('Second chunk failed'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () => useIncrementalQuery(uuids, defaultOptions({ chunkSize: 500 })),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    // Neither chunk's results should be accumulated since Promise.all failed
    expect(result.current.data.size).toBe(0);

    vi.restoreAllMocks();
  });

  it('resets state when enabled becomes false', async () => {
    mockFetchChunk.mockResolvedValueOnce(new Set(['a']));
    const { wrapper } = createWrapper();

    const { result, rerender } = renderHook(
      ({ enabled }) => useIncrementalQuery(['a'], defaultOptions({ enabled })),
      { wrapper, initialProps: { enabled: true } },
    );

    await waitFor(() => {
      expect(result.current.data.has('a')).toBe(true);
    });

    // Disable (simulates logout)
    rerender({ enabled: false });

    await waitFor(() => {
      expect(result.current.data.size).toBe(0);
    });
  });

  it('re-fetches all UUIDs after re-enable', async () => {
    mockFetchChunk.mockResolvedValueOnce(new Set(['a']));
    const { wrapper } = createWrapper();

    const { result, rerender } = renderHook(
      ({ enabled }) => useIncrementalQuery(['a', 'b'], defaultOptions({ enabled })),
      { wrapper, initialProps: { enabled: true } },
    );

    await waitFor(() => {
      expect(result.current.data.has('a')).toBe(true);
    });

    // Disable then re-enable — should re-fetch both UUIDs
    rerender({ enabled: false });
    await waitFor(() => expect(result.current.data.size).toBe(0));

    mockFetchChunk.mockResolvedValueOnce(new Set(['a', 'b']));
    rerender({ enabled: true });

    await waitFor(() => {
      expect(result.current.data.has('a')).toBe(true);
      expect(result.current.data.has('b')).toBe(true);
    });
    // Should have been fetched again (not skipped as "already fetched")
    expect(mockFetchChunk).toHaveBeenCalledTimes(2);
  });

  it('picks up external cache updates (optimistic updates)', async () => {
    mockFetchChunk.mockResolvedValueOnce(new Set(['a']));
    const { wrapper, queryClient } = createWrapper();

    const { result } = renderHook(
      () => useIncrementalQuery(['a'], defaultOptions()),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.data.has('a')).toBe(true);
    });

    // Simulate an external optimistic update
    act(() => {
      queryClient.setQueryData(['test', 'accumulated'], new Set(['a', 'x']));
    });

    await waitFor(() => {
      expect(result.current.data.has('x')).toBe(true);
    });
  });

  it('resets and re-fetches after cache invalidation (removal)', async () => {
    mockFetchChunk.mockResolvedValueOnce(new Set(['a']));
    const { wrapper, queryClient } = createWrapper();

    const { result } = renderHook(
      () => useIncrementalQuery(['a'], defaultOptions()),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.data.has('a')).toBe(true);
    });

    // Remove ALL test queries (both accumulated and fetch caches) to simulate
    // full invalidation, matching the useInvalidateLogbook pattern.
    // This clears the stale fetch cache so re-fetch actually calls fetchChunk again.
    mockFetchChunk.mockResolvedValueOnce(new Set(['a', 'refreshed']));
    act(() => {
      queryClient.removeQueries({ queryKey: ['test'] });
    });

    // Should re-fetch all UUIDs after invalidation
    await waitFor(() => {
      expect(result.current.data.has('refreshed')).toBe(true);
    });
  });
});
