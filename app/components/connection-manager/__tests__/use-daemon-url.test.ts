import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDaemonUrl } from '../use-daemon-url';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(() => ({
    get: vi.fn((key: string) => {
      if (key === 'daemonUrl') return null;
      return null;
    }),
  })),
}));

describe('useDaemonUrl', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should return null when no daemon URL is set', () => {
    const { result } = renderHook(() => useDaemonUrl());

    expect(result.current.daemonUrl).toBeNull();
    expect(result.current.hasUrlParam).toBe(false);
  });

  it('should return stored URL from localStorage', async () => {
    localStorage.setItem('boardsesh:daemonUrl', 'ws://localhost:8080');

    const { result, rerender } = renderHook(() => useDaemonUrl());

    // Wait for useEffect to run
    await act(async () => {
      rerender();
    });

    expect(result.current.daemonUrl).toBe('ws://localhost:8080');
  });

  it('should set daemon URL in localStorage', async () => {
    const { result } = renderHook(() => useDaemonUrl());

    await act(async () => {
      result.current.setDaemonUrl('ws://192.168.1.100:8080');
    });

    expect(localStorage.getItem('boardsesh:daemonUrl')).toBe('ws://192.168.1.100:8080');
    expect(result.current.daemonUrl).toBe('ws://192.168.1.100:8080');
  });

  it('should clear daemon URL from localStorage', async () => {
    localStorage.setItem('boardsesh:daemonUrl', 'ws://localhost:8080');

    const { result, rerender } = renderHook(() => useDaemonUrl());

    await act(async () => {
      rerender();
    });

    await act(async () => {
      result.current.clearDaemonUrl();
    });

    expect(localStorage.getItem('boardsesh:daemonUrl')).toBeNull();
    expect(result.current.daemonUrl).toBeNull();
  });

  it('should report isLoaded as true after mounting', async () => {
    const { result, rerender } = renderHook(() => useDaemonUrl());

    // After effect runs (useEffect runs synchronously in test environment)
    await act(async () => {
      rerender();
    });

    expect(result.current.isLoaded).toBe(true);
  });
});

describe('useDaemonUrl with URL param', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should prioritize URL param over localStorage', async () => {
    // Mock URL param
    const { useSearchParams } = await import('next/navigation');
    vi.mocked(useSearchParams).mockReturnValue({
      get: vi.fn((key: string) => {
        if (key === 'daemonUrl') return 'ws://url-param:8080';
        return null;
      }),
    } as ReturnType<typeof useSearchParams>);

    // Set localStorage value
    localStorage.setItem('boardsesh:daemonUrl', 'ws://localhost:8080');

    const { result, rerender } = renderHook(() => useDaemonUrl());

    await act(async () => {
      rerender();
    });

    expect(result.current.daemonUrl).toBe('ws://url-param:8080');
    expect(result.current.hasUrlParam).toBe(true);
  });

  it('should sync URL param to localStorage', async () => {
    // Mock URL param
    const { useSearchParams } = await import('next/navigation');
    vi.mocked(useSearchParams).mockReturnValue({
      get: vi.fn((key: string) => {
        if (key === 'daemonUrl') return 'ws://url-param:8080';
        return null;
      }),
    } as ReturnType<typeof useSearchParams>);

    const { result, rerender } = renderHook(() => useDaemonUrl());

    await act(async () => {
      rerender();
    });

    // URL param should be persisted to localStorage
    expect(localStorage.getItem('boardsesh:daemonUrl')).toBe('ws://url-param:8080');
  });
});
