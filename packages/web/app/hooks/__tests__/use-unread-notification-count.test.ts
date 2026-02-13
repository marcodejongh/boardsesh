import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createQueryWrapper } from '@/app/test-utils/test-providers';

vi.mock('../use-ws-auth-token', () => ({
  useWsAuthToken: vi.fn(),
}));

const mockRequest = vi.fn();
vi.mock('@/app/lib/graphql/client', () => ({
  createGraphQLHttpClient: () => ({ request: mockRequest }),
}));

vi.mock('@/app/lib/graphql/operations', () => ({
  GET_UNREAD_NOTIFICATION_COUNT: 'GET_UNREAD_NOTIFICATION_COUNT_QUERY',
}));

import { useWsAuthToken } from '../use-ws-auth-token';
import { useUnreadNotificationCount, UNREAD_COUNT_QUERY_KEY } from '../use-unread-notification-count';

const mockUseWsAuthToken = vi.mocked(useWsAuthToken);

describe('useUnreadNotificationCount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest.mockReset();
  });

  it('returns 0 when not authenticated', () => {
    mockUseWsAuthToken.mockReturnValue({
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useUnreadNotificationCount(), {
      wrapper: createQueryWrapper(),
    });

    expect(result.current).toBe(0);
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('returns 0 while loading', () => {
    mockUseWsAuthToken.mockReturnValue({
      token: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,
    });

    const { result } = renderHook(() => useUnreadNotificationCount(), {
      wrapper: createQueryWrapper(),
    });

    expect(result.current).toBe(0);
  });

  it('returns count from GraphQL response', async () => {
    mockUseWsAuthToken.mockReturnValue({
      token: 'test-token',
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });

    mockRequest.mockResolvedValue({
      unreadNotificationCount: 5,
    });

    const { result } = renderHook(() => useUnreadNotificationCount(), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => {
      expect(result.current).toBe(5);
    });
  });

  it('uses correct query key', () => {
    expect(UNREAD_COUNT_QUERY_KEY).toEqual(['notifications', 'unreadCount']);
  });

  it('disabled when no token', () => {
    mockUseWsAuthToken.mockReturnValue({
      token: null,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useUnreadNotificationCount(), {
      wrapper: createQueryWrapper(),
    });

    expect(result.current).toBe(0);
    expect(mockRequest).not.toHaveBeenCalled();
  });
});
