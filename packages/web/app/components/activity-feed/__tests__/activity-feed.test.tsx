import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// Mocks — must be defined before importing the SUT
// ---------------------------------------------------------------------------

const mockWsAuth = {
  token: null as string | null,
  isAuthenticated: false,
  isLoading: false,
  error: null as string | null,
};

vi.mock('@/app/hooks/use-ws-auth-token', () => ({
  useWsAuthToken: () => mockWsAuth,
}));

const mockRequest = vi.fn();

vi.mock('@/app/lib/graphql/client', () => ({
  createGraphQLHttpClient: () => ({ request: mockRequest }),
}));

// Provide a minimal QueryClient wrapper since useWsAuthToken uses TanStack Query
// (but we've mocked it, so this is just for potential other hooks)
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');
  return {
    ...actual,
    useQuery: vi.fn().mockReturnValue({ data: undefined, isLoading: false, error: null }),
  };
});

// Now import the SUT — after all vi.mock calls
import ActivityFeed from '../activity-feed';
import type { ActivityFeedItem } from '@boardsesh/shared-schema';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockItem(overrides?: Partial<ActivityFeedItem>): ActivityFeedItem {
  return {
    id: `item-${Math.random().toString(36).slice(2)}`,
    type: 'ascent',
    entityType: 'tick',
    entityId: 'entity-1',
    actorDisplayName: 'Test Climber',
    climbName: 'Test Climb V3',
    boardType: 'kilter',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function createFeedResponse(items: ActivityFeedItem[], hasMore = false) {
  return {
    items,
    cursor: hasMore ? 'next-cursor' : null,
    hasMore,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ActivityFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWsAuth.token = null;
    mockWsAuth.isAuthenticated = false;
    mockWsAuth.isLoading = false;
    mockWsAuth.error = null;
  });

  describe('authSessionLoading behavior', () => {
    it('shows initialItems when authSessionLoading is true', () => {
      const items = [createMockItem({ climbName: 'Boulder Problem Alpha' })];

      render(
        <ActivityFeed
          isAuthenticated={false}
          authSessionLoading={true}
          initialItems={items}
        />,
      );

      expect(screen.getByText('Boulder Problem Alpha')).toBeInTheDocument();
      expect(mockRequest).not.toHaveBeenCalled();
      expect(screen.queryByText('Follow climbers to see their activity here')).not.toBeInTheDocument();
    });

    it('shows loading spinner when authSessionLoading is true and no initialItems', () => {
      render(
        <ActivityFeed
          isAuthenticated={false}
          authSessionLoading={true}
        />,
      );

      expect(screen.getByTestId('activity-feed-loading')).toBeInTheDocument();
      expect(screen.queryByText('Follow climbers to see their activity here')).not.toBeInTheDocument();
      expect(mockRequest).not.toHaveBeenCalled();
    });
  });

  describe('feed type selection', () => {
    it('fetches trending feed when unauthenticated', async () => {
      const trendingItems = [createMockItem({ climbName: 'Trending Route' })];
      mockRequest.mockResolvedValueOnce({
        trendingFeed: createFeedResponse(trendingItems),
      });

      render(
        <ActivityFeed
          isAuthenticated={false}
          authSessionLoading={false}
        />,
      );

      await waitFor(() => {
        expect(mockRequest).toHaveBeenCalledTimes(1);
      });

      // Should have called with the trending feed query (second positional arg: GET_TRENDING_FEED)
      const callArgs = mockRequest.mock.calls[0];
      expect(callArgs[0]).toContain('trendingFeed');
    });

    it('fetches authenticated feed when authenticated with token', async () => {
      mockWsAuth.token = 'jwt-token';
      mockWsAuth.isAuthenticated = true;

      const authItems = [createMockItem({ climbName: 'My Feed Route' })];
      mockRequest.mockResolvedValueOnce({
        activityFeed: createFeedResponse(authItems),
      });

      render(
        <ActivityFeed
          isAuthenticated={true}
          authSessionLoading={false}
        />,
      );

      await waitFor(() => {
        expect(mockRequest).toHaveBeenCalledTimes(1);
      });

      const callArgs = mockRequest.mock.calls[0];
      expect(callArgs[0]).toContain('activityFeed');
    });
  });

  describe('stale fetch protection', () => {
    it('discards stale fetch results when a newer fetch supersedes', async () => {
      // First render: unauthenticated, slow response
      let resolveFirst: (value: unknown) => void;
      const firstPromise = new Promise((resolve) => { resolveFirst = resolve; });

      const staleItems = [createMockItem({ climbName: 'Stale Item' })];
      const freshItems = [createMockItem({ climbName: 'Fresh Item' })];

      mockRequest.mockReturnValueOnce(firstPromise);

      const { rerender } = render(
        <ActivityFeed
          isAuthenticated={false}
          authSessionLoading={false}
        />,
      );

      // Wait for the first fetch to be initiated
      await waitFor(() => {
        expect(mockRequest).toHaveBeenCalledTimes(1);
      });

      // Second render: now authenticated with token (session resolved)
      mockWsAuth.token = 'jwt-token';
      mockWsAuth.isAuthenticated = true;

      mockRequest.mockResolvedValueOnce({
        activityFeed: createFeedResponse(freshItems),
      });

      rerender(
        <ActivityFeed
          isAuthenticated={true}
          authSessionLoading={false}
        />,
      );

      // Wait for fresh fetch to complete
      await waitFor(() => {
        expect(screen.getByText('Fresh Item')).toBeInTheDocument();
      });

      // Now resolve the stale first fetch — it should be discarded
      await act(async () => {
        resolveFirst!({
          trendingFeed: createFeedResponse(staleItems),
        });
      });

      // Fresh items should still be shown, stale items should not appear
      expect(screen.getByText('Fresh Item')).toBeInTheDocument();
      expect(screen.queryByText('Stale Item')).not.toBeInTheDocument();
    });
  });

  describe('empty state protection', () => {
    it('never shows empty state while waiting for auth token', async () => {
      mockWsAuth.token = null;
      mockWsAuth.isLoading = true;

      const items = [createMockItem({ climbName: 'Existing Item' })];

      render(
        <ActivityFeed
          isAuthenticated={true}
          authSessionLoading={false}
          initialItems={items}
        />,
      );

      // Items should remain visible
      expect(screen.getByText('Existing Item')).toBeInTheDocument();
      // Empty state should not appear
      expect(screen.queryByText('Follow climbers to see their activity here')).not.toBeInTheDocument();
      // No fetch should have been made yet (waiting for token)
      expect(mockRequest).not.toHaveBeenCalled();
    });

    it('shows empty state only after authenticated fetch returns empty', async () => {
      mockWsAuth.token = 'jwt-token';
      mockWsAuth.isAuthenticated = true;

      mockRequest.mockResolvedValueOnce({
        activityFeed: createFeedResponse([]),
      });

      render(
        <ActivityFeed
          isAuthenticated={true}
          authSessionLoading={false}
        />,
      );

      await waitFor(() => {
        expect(screen.getByTestId('activity-feed-empty-state')).toBeInTheDocument();
      });

      expect(screen.getByText('Follow climbers to see their activity here')).toBeInTheDocument();
    });
  });
});
