import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

vi.mock('@/app/lib/url-utils', () => ({
  searchParamsToUrlParams: vi.fn(() => new URLSearchParams('minGrade=1')),
}));

import useHeatmapData from '../use-heatmap';
import { searchParamsToUrlParams } from '@/app/lib/url-utils';

const defaultProps = {
  boardName: 'kilter' as const,
  layoutId: 1,
  sizeId: 10,
  setIds: '1,2',
  angle: 40,
  filters: { minGrade: 1 } as any,
  enabled: true,
};

describe('useHeatmapData', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns empty array initially', () => {
    mockFetch.mockReturnValue(new Promise(() => {})); // Never resolves

    const { result } = renderHook(() => useHeatmapData(defaultProps));

    expect(result.current.data).toEqual([]);
  });

  it('returns loading=true initially then data after fetch', async () => {
    const holdStats = [{ holdId: 1, count: 5 }];
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ holdStats }),
    });

    const { result } = renderHook(() => useHeatmapData(defaultProps));

    // Initially loading
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(holdStats);
  });

  it('sets heatmapData from response.holdStats', async () => {
    const holdStats = [
      { holdId: 1, count: 10 },
      { holdId: 2, count: 3 },
    ];
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ holdStats }),
    });

    const { result } = renderHook(() => useHeatmapData(defaultProps));

    await waitFor(() => {
      expect(result.current.data).toEqual(holdStats);
    });
  });

  it('handles fetch error', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useHeatmapData(defaultProps));

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Network error');
    });

    expect(result.current.loading).toBe(false);
    vi.restoreAllMocks();
  });

  it('does not fetch when enabled=false', () => {
    const { result } = renderHook(() =>
      useHeatmapData({ ...defaultProps, enabled: false }),
    );

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it('cancels fetch on unmount (cancelled flag)', async () => {
    let resolvePromise: (value: any) => void;
    const fetchPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockFetch.mockReturnValue(fetchPromise);

    const { unmount, result } = renderHook(() => useHeatmapData(defaultProps));

    // Unmount before fetch resolves
    unmount();

    // Resolve after unmount
    await act(async () => {
      resolvePromise!({
        ok: true,
        json: () => Promise.resolve({ holdStats: [{ holdId: 1, count: 99 }] }),
      });
    });

    // Data should not have been set (cancelled)
    expect(result.current.data).toEqual([]);
  });

  it('constructs correct URL from params', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ holdStats: [] }),
    });

    renderHook(() => useHeatmapData(defaultProps));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/kilter/1/10/1,2/40/heatmap?minGrade=1',
      );
    });

    expect(searchParamsToUrlParams).toHaveBeenCalledWith(defaultProps.filters);
  });

  it('handles non-ok response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useHeatmapData(defaultProps));

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Failed to fetch heatmap data');
    });

    vi.restoreAllMocks();
  });

  it('re-fetches when params change', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ holdStats: [] }),
    });

    const { rerender } = renderHook(
      (props: typeof defaultProps) => useHeatmapData(props),
      { initialProps: defaultProps },
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    rerender({ ...defaultProps, angle: 45 });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
