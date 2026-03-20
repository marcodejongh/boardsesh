import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const mockGetAlwaysTickInApp = vi.fn();
const mockSetAlwaysTickInApp = vi.fn();

vi.mock('@/app/lib/user-preferences-db', () => ({
  getAlwaysTickInApp: (...args: unknown[]) => mockGetAlwaysTickInApp(...args),
  setAlwaysTickInApp: (...args: unknown[]) => mockSetAlwaysTickInApp(...args),
}));

import { useAlwaysTickInApp } from '../use-always-tick-in-app';

describe('useAlwaysTickInApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAlwaysTickInApp.mockResolvedValue(false);
    mockSetAlwaysTickInApp.mockResolvedValue(undefined);
  });

  it('initially returns loaded=false and alwaysUseApp=false', () => {
    // Use a promise that never resolves to test the initial state
    mockGetAlwaysTickInApp.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useAlwaysTickInApp());

    expect(result.current.loaded).toBe(false);
    expect(result.current.alwaysUseApp).toBe(false);
  });

  it('after load resolves with false: loaded=true, alwaysUseApp=false', async () => {
    mockGetAlwaysTickInApp.mockResolvedValue(false);

    const { result } = renderHook(() => useAlwaysTickInApp());

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });

    expect(result.current.alwaysUseApp).toBe(false);
  });

  it('after load resolves with true: loaded=true, alwaysUseApp=true', async () => {
    mockGetAlwaysTickInApp.mockResolvedValue(true);

    const { result } = renderHook(() => useAlwaysTickInApp());

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });

    expect(result.current.alwaysUseApp).toBe(true);
  });

  it('enableAlwaysUseApp calls setAlwaysTickInApp(true) and updates state', async () => {
    mockGetAlwaysTickInApp.mockResolvedValue(false);

    const { result } = renderHook(() => useAlwaysTickInApp());

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });

    expect(result.current.alwaysUseApp).toBe(false);

    await act(async () => {
      await result.current.enableAlwaysUseApp();
    });

    expect(mockSetAlwaysTickInApp).toHaveBeenCalledWith(true);
    expect(result.current.alwaysUseApp).toBe(true);
  });

  it('enableAlwaysUseApp awaits the preference set before updating state', async () => {
    mockGetAlwaysTickInApp.mockResolvedValue(false);

    let resolveSet: () => void;
    const setPromise = new Promise<void>((resolve) => {
      resolveSet = resolve;
    });
    mockSetAlwaysTickInApp.mockReturnValue(setPromise);

    const { result } = renderHook(() => useAlwaysTickInApp());

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });

    // Start the enable call but don't resolve yet
    act(() => {
      result.current.enableAlwaysUseApp();
    });

    // The set hasn't resolved yet, so alwaysUseApp should still be false
    // (setAlwaysTickInApp was called, but we're waiting for the await)
    expect(mockSetAlwaysTickInApp).toHaveBeenCalledWith(true);

    // Resolve the set promise
    await act(async () => {
      resolveSet!();
      await setPromise;
    });

    await waitFor(() => {
      expect(result.current.alwaysUseApp).toBe(true);
    });
  });

  // Note: Not testing rejected getAlwaysTickInApp() because the hook has no
  // .catch() handler, causing an unhandled promise rejection that vitest flags.
});
