import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, render, act, waitFor } from '@testing-library/react';
import { usePaginatedFeed } from '../use-paginated-feed';

// Mock IntersectionObserver
let intersectionCallback: IntersectionObserverCallback | null = null;
let mockObserve: ReturnType<typeof vi.fn>;
let mockDisconnect: ReturnType<typeof vi.fn>;
let mockUnobserve: ReturnType<typeof vi.fn>;

class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = '200px';
  readonly thresholds: ReadonlyArray<number> = [0];

  constructor(callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {
    intersectionCallback = callback;
  }

  observe = mockObserve;
  disconnect = mockDisconnect;
  unobserve = mockUnobserve;
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

describe('usePaginatedFeed', () => {
  let mockFetchFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockObserve = vi.fn();
    mockDisconnect = vi.fn();
    mockUnobserve = vi.fn();
    intersectionCallback = null;

    // Set up the global IntersectionObserver mock
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

    mockFetchFn = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('fetches first page on mount when enabled', async () => {
    mockFetchFn.mockResolvedValue({
      items: [{ id: 1 }, { id: 2 }],
      hasMore: true,
      totalCount: 10,
    });

    const { result } = renderHook(() =>
      usePaginatedFeed({
        fetchFn: mockFetchFn,
        enabled: true,
      }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockFetchFn).toHaveBeenCalledWith(0);
    expect(result.current.items).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('sets loading true then false during initial fetch', async () => {
    let resolveFetch: (value: any) => void;
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = resolve;
    });
    mockFetchFn.mockReturnValue(fetchPromise);

    const { result } = renderHook(() =>
      usePaginatedFeed({
        fetchFn: mockFetchFn,
        enabled: true,
      }),
    );

    // Initial loading state is true (set in useState)
    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolveFetch!({ items: [{ id: 1 }], hasMore: false, totalCount: 1 });
    });

    expect(result.current.loading).toBe(false);
  });

  it('appends items on loadMore', async () => {
    // First page
    mockFetchFn.mockResolvedValueOnce({
      items: [{ id: 1 }, { id: 2 }],
      hasMore: true,
      totalCount: 4,
    });

    const { result } = renderHook(() =>
      usePaginatedFeed({
        fetchFn: mockFetchFn,
        enabled: true,
      }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.items).toHaveLength(2);

    // Second page
    mockFetchFn.mockResolvedValueOnce({
      items: [{ id: 3 }, { id: 4 }],
      hasMore: false,
      totalCount: 4,
    });

    await act(async () => {
      result.current.loadMore();
    });

    await waitFor(() => {
      expect(result.current.loadingMore).toBe(false);
    });

    expect(result.current.items).toEqual([
      { id: 1 },
      { id: 2 },
      { id: 3 },
      { id: 4 },
    ]);
  });

  it('sets hasMore and totalCount from response', async () => {
    mockFetchFn.mockResolvedValue({
      items: [{ id: 1 }],
      hasMore: true,
      totalCount: 50,
    });

    const { result } = renderHook(() =>
      usePaginatedFeed({
        fetchFn: mockFetchFn,
        enabled: true,
      }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.hasMore).toBe(true);
    expect(result.current.totalCount).toBe(50);
  });

  it('does not fetch when enabled=false', async () => {
    mockFetchFn.mockResolvedValue({
      items: [],
      hasMore: false,
      totalCount: 0,
    });

    const { result } = renderHook(() =>
      usePaginatedFeed({
        fetchFn: mockFetchFn,
        enabled: false,
      }),
    );

    // Wait a tick for effects to settle
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockFetchFn).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
    expect(result.current.items).toEqual([]);
  });

  it('handles fetch errors with console.error', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetchError = new Error('Network error');
    mockFetchFn.mockRejectedValue(fetchError);

    const { result } = renderHook(() =>
      usePaginatedFeed({
        fetchFn: mockFetchFn,
        enabled: true,
      }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching feed:', fetchError);
    expect(result.current.items).toEqual([]);

    consoleErrorSpy.mockRestore();
  });

  it('loadMore uses current items.length as offset', async () => {
    mockFetchFn.mockResolvedValueOnce({
      items: [{ id: 1 }, { id: 2 }, { id: 3 }],
      hasMore: true,
      totalCount: 6,
    });

    const { result } = renderHook(() =>
      usePaginatedFeed({
        fetchFn: mockFetchFn,
        enabled: true,
      }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.items).toHaveLength(3);

    mockFetchFn.mockResolvedValueOnce({
      items: [{ id: 4 }, { id: 5 }, { id: 6 }],
      hasMore: false,
      totalCount: 6,
    });

    await act(async () => {
      result.current.loadMore();
    });

    // The offset should be 3 (current items.length)
    expect(mockFetchFn).toHaveBeenLastCalledWith(3);
  });

  it('IntersectionObserver auto-triggers loadMore when intersecting', async () => {
    mockFetchFn.mockResolvedValueOnce({
      items: [{ id: 1 }],
      hasMore: true,
      totalCount: 5,
    });

    // Use a component wrapper so sentinelRef gets attached to a real DOM element
    function TestComponent() {
      const feed = usePaginatedFeed({ fetchFn: mockFetchFn, enabled: true });
      return React.createElement('div', { ref: feed.sentinelRef, 'data-testid': 'sentinel' });
    }

    render(React.createElement(TestComponent));

    await waitFor(() => {
      expect(mockObserve).toHaveBeenCalled();
    });

    // Prepare the next fetch response
    mockFetchFn.mockResolvedValueOnce({
      items: [{ id: 2 }],
      hasMore: false,
      totalCount: 5,
    });

    // Simulate intersection observer triggering
    expect(intersectionCallback).not.toBeNull();
    const mockEntry = {
      isIntersecting: true,
      intersectionRatio: 1,
      target: document.createElement('div'),
      boundingClientRect: {} as DOMRectReadOnly,
      intersectionRect: {} as DOMRectReadOnly,
      rootBounds: null,
      time: Date.now(),
    } as IntersectionObserverEntry;

    act(() => {
      intersectionCallback!([mockEntry], {} as IntersectionObserver);
    });

    await waitFor(() => {
      expect(mockFetchFn).toHaveBeenCalledTimes(2);
    });

    // Second call should use offset = 1 (items.length after first fetch)
    expect(mockFetchFn).toHaveBeenLastCalledWith(1);
  });

  it('does not auto-load when not intersecting', async () => {
    mockFetchFn.mockResolvedValueOnce({
      items: [{ id: 1 }],
      hasMore: true,
      totalCount: 5,
    });

    renderHook(() =>
      usePaginatedFeed({
        fetchFn: mockFetchFn,
        enabled: true,
      }),
    );

    await waitFor(() => {
      expect(mockFetchFn).toHaveBeenCalledTimes(1);
    });

    // Simulate non-intersecting entry
    if (intersectionCallback) {
      const mockEntry = {
        isIntersecting: false,
        intersectionRatio: 0,
        target: document.createElement('div'),
        boundingClientRect: {} as DOMRectReadOnly,
        intersectionRect: {} as DOMRectReadOnly,
        rootBounds: null,
        time: Date.now(),
      } as IntersectionObserverEntry;

      act(() => {
        intersectionCallback!([mockEntry], {} as IntersectionObserver);
      });
    }

    // Should not have fetched again
    expect(mockFetchFn).toHaveBeenCalledTimes(1);
  });

  it('does not auto-load when hasMore is false', async () => {
    mockFetchFn.mockResolvedValueOnce({
      items: [{ id: 1 }],
      hasMore: false,
      totalCount: 1,
    });

    renderHook(() =>
      usePaginatedFeed({
        fetchFn: mockFetchFn,
        enabled: true,
      }),
    );

    await waitFor(() => {
      expect(mockFetchFn).toHaveBeenCalledTimes(1);
    });

    // Simulate intersecting entry, but hasMore is false
    if (intersectionCallback) {
      const mockEntry = {
        isIntersecting: true,
        intersectionRatio: 1,
        target: document.createElement('div'),
        boundingClientRect: {} as DOMRectReadOnly,
        intersectionRect: {} as DOMRectReadOnly,
        rootBounds: null,
        time: Date.now(),
      } as IntersectionObserverEntry;

      act(() => {
        intersectionCallback!([mockEntry], {} as IntersectionObserver);
      });
    }

    // Should not have fetched again since hasMore is false
    expect(mockFetchFn).toHaveBeenCalledTimes(1);
  });

  it('cleans up observer on unmount', async () => {
    mockFetchFn.mockResolvedValue({
      items: [],
      hasMore: false,
      totalCount: 0,
    });

    // Use a component wrapper so the observer is actually created
    function TestComponent() {
      const feed = usePaginatedFeed({ fetchFn: mockFetchFn, enabled: true });
      return React.createElement('div', { ref: feed.sentinelRef, 'data-testid': 'sentinel' });
    }

    const { unmount } = render(React.createElement(TestComponent));

    await waitFor(() => {
      expect(mockObserve).toHaveBeenCalled();
    });

    unmount();

    expect(mockDisconnect).toHaveBeenCalled();
  });
});
