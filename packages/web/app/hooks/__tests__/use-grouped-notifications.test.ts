import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createQueryWrapper, createTestQueryClient } from '@/app/test-utils/test-providers';
import { QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('../use-ws-auth-token', () => ({
  useWsAuthToken: vi.fn(),
}));

const mockRequest = vi.fn();
vi.mock('@/app/lib/graphql/client', () => ({
  createGraphQLHttpClient: () => ({ request: mockRequest }),
}));

vi.mock('@/app/lib/graphql/operations', () => ({
  GET_GROUPED_NOTIFICATIONS: 'GET_GROUPED_NOTIFICATIONS_QUERY',
}));

vi.mock('../use-unread-notification-count', () => ({
  UNREAD_COUNT_QUERY_KEY: ['notifications', 'unreadCount'],
}));

import { useWsAuthToken } from '../use-ws-auth-token';
import { useGroupedNotifications, GROUPED_NOTIFICATIONS_QUERY_KEY } from '../use-grouped-notifications';

const mockUseWsAuthToken = vi.mocked(useWsAuthToken);

function createMockGroup(overrides: Record<string, unknown> = {}) {
  return {
    uuid: 'group-1',
    type: 'COMMENT',
    entityType: 'CLIMB',
    entityId: 'entity-1',
    actorCount: 1,
    actors: [{ id: 'actor-1', displayName: 'User1', avatarUrl: null }],
    commentBody: 'Great climb!',
    climbName: 'Test Climb',
    climbUuid: 'climb-uuid-1',
    boardType: 'kilter',
    isRead: false,
    createdAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('useGroupedNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest.mockReset();
  });

  it('returns empty array when not authenticated', () => {
    mockUseWsAuthToken.mockReturnValue({
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useGroupedNotifications(), {
      wrapper: createQueryWrapper(),
    });

    expect(result.current.groupedNotifications).toEqual([]);
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('returns loading state', () => {
    mockUseWsAuthToken.mockReturnValue({
      token: 'test-token',
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });

    mockRequest.mockReturnValue(new Promise(() => {})); // never resolves

    const { result } = renderHook(() => useGroupedNotifications(), {
      wrapper: createQueryWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });

  it('fetches and flattens grouped notifications from pages', async () => {
    mockUseWsAuthToken.mockReturnValue({
      token: 'test-token',
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });

    const group1 = createMockGroup({ uuid: 'group-1' });
    const group2 = createMockGroup({ uuid: 'group-2' });

    mockRequest.mockResolvedValue({
      groupedNotifications: {
        groups: [group1, group2],
        totalCount: 2,
        unreadCount: 1,
        hasMore: false,
      },
    });

    const { result } = renderHook(() => useGroupedNotifications(), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => {
      expect(result.current.groupedNotifications.length).toBe(2);
    });

    expect(result.current.groupedNotifications[0].uuid).toBe('group-1');
    expect(result.current.groupedNotifications[1].uuid).toBe('group-2');
  });

  it('hasMore reflects query state', async () => {
    mockUseWsAuthToken.mockReturnValue({
      token: 'test-token',
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });

    mockRequest.mockResolvedValue({
      groupedNotifications: {
        groups: [createMockGroup()],
        totalCount: 50,
        unreadCount: 10,
        hasMore: true,
      },
    });

    const { result } = renderHook(() => useGroupedNotifications(), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => {
      expect(result.current.groupedNotifications.length).toBe(1);
    });

    expect(result.current.hasMore).toBe(true);
  });

  it('fetchMore is available', async () => {
    mockUseWsAuthToken.mockReturnValue({
      token: 'test-token',
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });

    mockRequest.mockResolvedValue({
      groupedNotifications: {
        groups: [createMockGroup()],
        totalCount: 1,
        unreadCount: 0,
        hasMore: false,
      },
    });

    const { result } = renderHook(() => useGroupedNotifications(), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.fetchMore).toBe('function');
  });

  it('syncs unread count to cache', async () => {
    const queryClient = createTestQueryClient();

    mockUseWsAuthToken.mockReturnValue({
      token: 'test-token',
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });

    mockRequest.mockResolvedValue({
      groupedNotifications: {
        groups: [createMockGroup()],
        totalCount: 1,
        unreadCount: 7,
        hasMore: false,
      },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useGroupedNotifications(), { wrapper });

    await waitFor(() => {
      expect(result.current.groupedNotifications.length).toBe(1);
    });

    // Check that the unread count was synced to cache
    const cachedCount = queryClient.getQueryData(['notifications', 'unreadCount']);
    expect(cachedCount).toBe(7);
  });

  it('uses correct query key', () => {
    expect(GROUPED_NOTIFICATIONS_QUERY_KEY).toEqual(['notifications', 'grouped']);
  });

  it('initial page param is 0', async () => {
    mockUseWsAuthToken.mockReturnValue({
      token: 'test-token',
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });

    mockRequest.mockResolvedValue({
      groupedNotifications: {
        groups: [],
        totalCount: 0,
        unreadCount: 0,
        hasMore: false,
      },
    });

    renderHook(() => useGroupedNotifications(), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalled();
    });

    // Verify the offset passed in the first call is 0
    const callArgs = mockRequest.mock.calls[0];
    expect(callArgs[1]).toEqual({ limit: 20, offset: 0 });
  });
});
