import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createQueryWrapper } from '@/app/test-utils/test-providers';
import { useWsAuthToken } from '../use-ws-auth-token';

const mockUseSession = vi.fn();
vi.mock('next-auth/react', () => ({
  useSession: () => mockUseSession(),
}));

const mockFetch = vi.fn();

describe('useWsAuthToken', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
    mockUseSession.mockReturnValue({ status: 'authenticated' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns loading initially', () => {
    mockFetch.mockReturnValue(new Promise(() => {})); // never resolves

    const { result } = renderHook(() => useWsAuthToken(), {
      wrapper: createQueryWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('returns token and isAuthenticated when fetch succeeds', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ token: 'test-token-123', authenticated: true }),
    });

    const { result } = renderHook(() => useWsAuthToken(), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.token).toBe('test-token-123');
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('returns null token when API returns null token', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ token: null, authenticated: false }),
    });

    const { result } = renderHook(() => useWsAuthToken(), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('returns error message when fetch fails', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    });

    const { result } = renderHook(() => useWsAuthToken(), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to fetch auth token: 500');
    expect(result.current.token).toBeNull();
  });

  it('returns API error from response data', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          token: null,
          authenticated: false,
          error: 'Session expired',
        }),
    });

    const { result } = renderHook(() => useWsAuthToken(), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Session expired');
  });

  it('isAuthenticated defaults to false before data loads', () => {
    mockFetch.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useWsAuthToken(), {
      wrapper: createQueryWrapper(),
    });

    expect(result.current.isAuthenticated).toBe(false);
  });

  it('token defaults to null before data loads', () => {
    mockFetch.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useWsAuthToken(), {
      wrapper: createQueryWrapper(),
    });

    expect(result.current.token).toBeNull();
  });

  it('returns loading when session status is loading', () => {
    mockUseSession.mockReturnValue({ status: 'loading' });
    mockFetch.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useWsAuthToken(), {
      wrapper: createQueryWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });

  it('does not fetch when session status is loading', () => {
    mockUseSession.mockReturnValue({ status: 'loading' });

    renderHook(() => useWsAuthToken(), {
      wrapper: createQueryWrapper(),
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });
});
