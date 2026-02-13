import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { createTestQueryClient } from '@/app/test-utils/test-providers';
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
  MARK_GROUP_NOTIFICATIONS_READ: 'MARK_GROUP_NOTIFICATIONS_READ_MUTATION',
  MARK_ALL_NOTIFICATIONS_READ: 'MARK_ALL_NOTIFICATIONS_READ_MUTATION',
}));

vi.mock('../use-unread-notification-count', () => ({
  UNREAD_COUNT_QUERY_KEY: ['notifications', 'unreadCount'],
}));

vi.mock('../use-grouped-notifications', () => ({
  GROUPED_NOTIFICATIONS_QUERY_KEY: ['notifications', 'grouped'],
}));

import { useWsAuthToken } from '../use-ws-auth-token';
import { useMarkGroupAsRead, useMarkAllAsRead } from '../use-mark-notifications-read';

const mockUseWsAuthToken = vi.mocked(useWsAuthToken);

function createMockNotification(overrides: Record<string, unknown> = {}) {
  return {
    uuid: 'notif-1',
    type: 'COMMENT',
    entityType: 'CLIMB',
    entityId: 'entity-1',
    actorCount: 1,
    actors: [{ id: 'actor-1', displayName: 'User1', avatarUrl: null }],
    commentBody: 'Test',
    climbName: 'Climb1',
    climbUuid: 'climb-1',
    boardType: 'kilter',
    isRead: false,
    createdAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

function createTestWrapper() {
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { wrapper, queryClient };
}

describe('useMarkGroupAsRead', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest.mockReset();
    mockUseWsAuthToken.mockReturnValue({
      token: 'test-token',
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });
  });

  it('calls GraphQL mutation with correct variables', async () => {
    const { wrapper } = createTestWrapper();

    mockRequest.mockResolvedValue({ markGroupNotificationsRead: 3 });

    const notification = createMockNotification({
      type: 'FOLLOW',
      entityType: 'USER',
      entityId: 'user-123',
    });

    const { result } = renderHook(() => useMarkGroupAsRead(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(notification as any);
    });

    expect(mockRequest).toHaveBeenCalledWith(
      'MARK_GROUP_NOTIFICATIONS_READ_MUTATION',
      {
        type: 'FOLLOW',
        entityType: 'USER',
        entityId: 'user-123',
      },
    );
  });

  it('updates grouped notifications cache on success (marks group as read)', async () => {
    const { wrapper, queryClient } = createTestWrapper();

    const notification = createMockNotification({ uuid: 'notif-1', isRead: false });

    // Seed the grouped notifications cache
    queryClient.setQueryData(['notifications', 'grouped'], {
      pages: [
        {
          groups: [
            createMockNotification({ uuid: 'notif-1', isRead: false }),
            createMockNotification({ uuid: 'notif-2', isRead: false }),
          ],
          totalCount: 2,
          unreadCount: 2,
          hasMore: false,
        },
      ],
      pageParams: [0],
    });

    mockRequest.mockResolvedValue({ markGroupNotificationsRead: 1 });

    const { result } = renderHook(() => useMarkGroupAsRead(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(notification as any);
    });

    const cache = queryClient.getQueryData(['notifications', 'grouped']) as any;
    expect(cache.pages[0].groups[0].isRead).toBe(true);
    expect(cache.pages[0].groups[1].isRead).toBe(false);
  });

  it('updates unread count cache on success', async () => {
    const { wrapper, queryClient } = createTestWrapper();

    queryClient.setQueryData(['notifications', 'unreadCount'], 5);

    mockRequest.mockResolvedValue({ markGroupNotificationsRead: 2 });

    const notification = createMockNotification();

    const { result } = renderHook(() => useMarkGroupAsRead(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(notification as any);
    });

    const count = queryClient.getQueryData(['notifications', 'unreadCount']);
    expect(count).toBe(3);
  });

  it('handles unread count correctly (decrements by markedCount)', async () => {
    const { wrapper, queryClient } = createTestWrapper();

    queryClient.setQueryData(['notifications', 'unreadCount'], 10);

    mockRequest.mockResolvedValue({ markGroupNotificationsRead: 4 });

    const notification = createMockNotification();

    const { result } = renderHook(() => useMarkGroupAsRead(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(notification as any);
    });

    const count = queryClient.getQueryData(['notifications', 'unreadCount']);
    expect(count).toBe(6);
  });
});

describe('useMarkAllAsRead', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest.mockReset();
    mockUseWsAuthToken.mockReturnValue({
      token: 'test-token',
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });
  });

  it('calls GraphQL mutation', async () => {
    const { wrapper } = createTestWrapper();

    mockRequest.mockResolvedValue({ markAllNotificationsRead: true });

    const { result } = renderHook(() => useMarkAllAsRead(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(mockRequest).toHaveBeenCalledWith('MARK_ALL_NOTIFICATIONS_READ_MUTATION');
  });

  it('marks all groups as read in cache', async () => {
    const { wrapper, queryClient } = createTestWrapper();

    // Seed the grouped notifications cache
    queryClient.setQueryData(['notifications', 'grouped'], {
      pages: [
        {
          groups: [
            createMockNotification({ uuid: 'n1', isRead: false }),
            createMockNotification({ uuid: 'n2', isRead: false }),
            createMockNotification({ uuid: 'n3', isRead: true }),
          ],
          totalCount: 3,
          unreadCount: 2,
          hasMore: false,
        },
      ],
      pageParams: [0],
    });

    mockRequest.mockResolvedValue({ markAllNotificationsRead: true });

    const { result } = renderHook(() => useMarkAllAsRead(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync();
    });

    const cache = queryClient.getQueryData(['notifications', 'grouped']) as any;
    expect(cache.pages[0].groups.every((n: any) => n.isRead === true)).toBe(true);
  });

  it('resets unread count to 0', async () => {
    const { wrapper, queryClient } = createTestWrapper();

    queryClient.setQueryData(['notifications', 'unreadCount'], 15);

    mockRequest.mockResolvedValue({ markAllNotificationsRead: true });

    const { result } = renderHook(() => useMarkAllAsRead(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync();
    });

    const count = queryClient.getQueryData(['notifications', 'unreadCount']);
    expect(count).toBe(0);
  });
});
