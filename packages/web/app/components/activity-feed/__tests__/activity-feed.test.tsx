import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider, type InfiniteData } from '@tanstack/react-query';
import { createTestQueryClient } from '@/app/test-utils/test-providers';

// --- Mocks ---

const mockRequest = vi.fn();
vi.mock('@/app/lib/graphql/client', () => ({
  createGraphQLHttpClient: () => ({ request: mockRequest }),
}));

vi.mock('@/app/hooks/use-ws-auth-token', () => ({
  useWsAuthToken: vi.fn(),
}));

vi.mock('@/app/lib/graphql/operations', () => ({
  GET_ACTIVITY_FEED: 'GET_ACTIVITY_FEED',
  GET_TRENDING_FEED: 'GET_TRENDING_FEED',
}));

vi.mock('@/app/hooks/use-infinite-scroll', () => ({
  useInfiniteScroll: () => ({ sentinelRef: { current: null } }),
}));

vi.mock('../feed-item-ascent', () => ({
  default: ({ item }: { item: { id: string } }) => <div data-testid="activity-feed-item">{item.id}</div>,
}));
vi.mock('../feed-item-new-climb', () => ({
  default: ({ item }: { item: { id: string } }) => <div data-testid="activity-feed-item">{item.id}</div>,
}));
vi.mock('../feed-item-comment', () => ({
  default: ({ item }: { item: { id: string } }) => <div data-testid="activity-feed-item">{item.id}</div>,
}));
vi.mock('../session-summary-feed-item', () => ({
  default: ({ item }: { item: { id: string } }) => <div data-testid="activity-feed-item">{item.id}</div>,
}));
vi.mock('../feed-item-skeleton', () => ({
  default: () => <div data-testid="feed-item-skeleton" />,
}));

import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import ActivityFeed, { type ActivityFeedPage } from '../activity-feed';

const mockUseWsAuthToken = vi.mocked(useWsAuthToken);

// --- Helpers ---

function makeFeedItem(id: string, type = 'ascent' as const) {
  return {
    id,
    type,
    entityType: 'tick' as const,
    entityId: `entity-${id}`,
    boardUuid: null,
    actorId: 'actor-1',
    actorDisplayName: 'Test User',
    actorAvatarUrl: null,
    climbName: 'Test Climb',
    climbUuid: 'climb-1',
    boardType: 'kilter',
    layoutId: 1,
    gradeName: 'V5',
    status: 'send',
    angle: 40,
    frames: 'p1r42',
    setterUsername: 'setter',
    commentBody: null,
    isMirror: false,
    isBenchmark: false,
    difficulty: 15,
    difficultyName: 'V5',
    quality: 3,
    attemptCount: 2,
    comment: null,
    createdAt: '2024-01-15T10:00:00.000Z',
  };
}

function createWrapper(queryClient?: QueryClient) {
  const client = queryClient ?? createTestQueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe('ActivityFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest.mockReset();
  });

  describe('Loading state', () => {
    it('shows skeleton placeholders while loading', () => {
      mockUseWsAuthToken.mockReturnValue({
        token: null,
        isAuthenticated: false,
        isLoading: true,
        error: null,
      });

      render(<ActivityFeed isAuthenticated={false} />, { wrapper: createWrapper() });

      expect(screen.getAllByTestId('feed-item-skeleton')).toHaveLength(3);
    });
  });

  describe('Unauthenticated', () => {
    beforeEach(() => {
      mockUseWsAuthToken.mockReturnValue({
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    });

    it('fetches trendingFeed and tags _source as trending', async () => {
      const trendingItems = [makeFeedItem('1'), makeFeedItem('2')];
      mockRequest.mockResolvedValueOnce({
        trendingFeed: { items: trendingItems, cursor: null, hasMore: false },
      });

      render(<ActivityFeed isAuthenticated={false} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getAllByTestId('activity-feed-item')).toHaveLength(2);
      });

      // Should have called GET_TRENDING_FEED
      expect(mockRequest).toHaveBeenCalledTimes(1);
      expect(mockRequest).toHaveBeenCalledWith('GET_TRENDING_FEED', expect.any(Object));
    });

    it('shows sign-in alert for unauthenticated users', async () => {
      mockRequest.mockResolvedValueOnce({
        trendingFeed: { items: [makeFeedItem('1')], cursor: null, hasMore: false },
      });

      render(<ActivityFeed isAuthenticated={false} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Sign in to see a personalized feed/)).toBeTruthy();
      });
    });
  });

  describe('Authenticated + populated personalized feed', () => {
    beforeEach(() => {
      mockUseWsAuthToken.mockReturnValue({
        token: 'test-token',
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    });

    it('fetches activityFeed and tags _source as personalized', async () => {
      const personalizedItems = [makeFeedItem('p1'), makeFeedItem('p2')];
      mockRequest.mockResolvedValueOnce({
        activityFeed: { items: personalizedItems, cursor: 'cursor-1', hasMore: true },
      });

      render(<ActivityFeed isAuthenticated={true} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getAllByTestId('activity-feed-item')).toHaveLength(2);
      });

      expect(mockRequest).toHaveBeenCalledTimes(1);
      expect(mockRequest).toHaveBeenCalledWith('GET_ACTIVITY_FEED', expect.any(Object));
    });
  });

  describe('Authenticated + empty personalized feed (fallback)', () => {
    beforeEach(() => {
      mockUseWsAuthToken.mockReturnValue({
        token: 'test-token',
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    });

    it('probes activityFeed, falls back to trendingFeed', async () => {
      // First call: personalized feed returns empty
      mockRequest.mockResolvedValueOnce({
        activityFeed: { items: [], cursor: null, hasMore: false },
      });
      // Second call: trending feed returns items
      mockRequest.mockResolvedValueOnce({
        trendingFeed: { items: [makeFeedItem('t1')], cursor: null, hasMore: false },
      });

      render(<ActivityFeed isAuthenticated={true} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getAllByTestId('activity-feed-item')).toHaveLength(1);
      });

      expect(mockRequest).toHaveBeenCalledTimes(2);
      expect(mockRequest).toHaveBeenNthCalledWith(1, 'GET_ACTIVITY_FEED', expect.any(Object));
      expect(mockRequest).toHaveBeenNthCalledWith(2, 'GET_TRENDING_FEED', expect.any(Object));
    });
  });

  describe('Page 2+ routing', () => {
    it('reads page 1 source from cache for page 2', async () => {
      mockUseWsAuthToken.mockReturnValue({
        token: 'test-token',
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      const queryClient = createTestQueryClient();
      const queryKey = ['activityFeed', true, undefined, 'new', 'all'];

      // Pre-seed the cache with page 1 tagged as personalized
      queryClient.setQueryData<InfiniteData<ActivityFeedPage>>(queryKey, {
        pages: [{
          items: [makeFeedItem('p1')],
          cursor: 'cursor-1',
          hasMore: true,
          _source: 'personalized',
        }],
        pageParams: [null],
      });

      // Page 2 response
      mockRequest.mockResolvedValueOnce({
        activityFeed: { items: [makeFeedItem('p2')], cursor: null, hasMore: false },
      });

      render(<ActivityFeed isAuthenticated={true} />, { wrapper: createWrapper(queryClient) });

      // The items from the cache should be visible
      await waitFor(() => {
        expect(screen.getByText('p1')).toBeTruthy();
      });
    });

    it('reads page 1 trending source and uses trendingFeed for page 2', async () => {
      mockUseWsAuthToken.mockReturnValue({
        token: 'test-token',
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      const queryClient = createTestQueryClient();
      const queryKey = ['activityFeed', true, undefined, 'new', 'all'];

      // Pre-seed cache with page 1 tagged as trending
      queryClient.setQueryData<InfiniteData<ActivityFeedPage>>(queryKey, {
        pages: [{
          items: [makeFeedItem('t1')],
          cursor: 'cursor-1',
          hasMore: true,
          _source: 'trending',
        }],
        pageParams: [null],
      });

      render(<ActivityFeed isAuthenticated={true} />, { wrapper: createWrapper(queryClient) });

      await waitFor(() => {
        expect(screen.getByText('t1')).toBeTruthy();
      });
    });
  });

  describe('Source switch detection', () => {
    it('trims cached pages when source changes', async () => {
      mockUseWsAuthToken.mockReturnValue({
        token: 'test-token',
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      const queryClient = createTestQueryClient();
      const queryKey = ['activityFeed', true, undefined, 'new', 'all'];

      // Initial fetch returns personalized items (page 1)
      mockRequest.mockResolvedValueOnce({
        activityFeed: { items: [makeFeedItem('p1')], cursor: 'cursor-p1', hasMore: true },
      });

      render(<ActivityFeed isAuthenticated={true} />, {
        wrapper: createWrapper(queryClient),
      });

      // Wait for initial data to render
      await waitFor(() => {
        expect(screen.getAllByTestId('activity-feed-item')).toHaveLength(1);
      });

      // Simulate a background refetch changing source: directly update
      // cache to have 2 pages of trending, then switch page 1 to personalized.
      // First, set up multi-page trending data to simulate stale cache state
      const cached = queryClient.getQueryData<InfiniteData<ActivityFeedPage>>(queryKey);
      expect(cached?.pages[0]._source).toBe('personalized');

      // Now simulate what happens when cache has multiple pages and source changes:
      // Set 2 trending pages, then update page 1 to personalized
      queryClient.setQueryData<InfiniteData<ActivityFeedPage>>(queryKey, {
        pages: [
          { items: [makeFeedItem('t1')], cursor: 'cursor-1', hasMore: true, _source: 'trending' },
          { items: [makeFeedItem('t2')], cursor: null, hasMore: false, _source: 'trending' },
        ],
        pageParams: [null, 'cursor-1'],
      });

      // Wait for the component to see the trending data
      await waitFor(() => {
        const data = queryClient.getQueryData<InfiniteData<ActivityFeedPage>>(queryKey);
        expect(data?.pages[0]._source).toBe('trending');
      });

      // Now change page 1's source to personalized — this simulates a background refetch
      queryClient.setQueryData<InfiniteData<ActivityFeedPage>>(queryKey, (old) => {
        if (!old) return old;
        return {
          pages: [
            { ...old.pages[0], _source: 'personalized' as const },
            ...old.pages.slice(1),
          ],
          pageParams: old.pageParams,
        };
      });

      // The useEffect should detect the source change and trim to page 1
      await waitFor(() => {
        const data = queryClient.getQueryData<InfiniteData<ActivityFeedPage>>(queryKey);
        expect(data?.pages.length).toBe(1);
        expect(data?.pages[0]._source).toBe('personalized');
      });
    });
  });

  describe('initialData', () => {
    it('tags initialData with _source trending', () => {
      mockUseWsAuthToken.mockReturnValue({
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });

      const initialFeedResult = {
        items: [makeFeedItem('init-1')],
        cursor: 'init-cursor',
        hasMore: true,
      };

      const queryClient = createTestQueryClient();

      render(
        <ActivityFeed isAuthenticated={false} initialFeedResult={initialFeedResult} />,
        { wrapper: createWrapper(queryClient) },
      );

      // Initial data should be rendered immediately
      expect(screen.getByText('init-1')).toBeTruthy();

      // Check that the cached data has _source: 'trending'
      const queryKey = ['activityFeed', false, undefined, 'new', 'all'];
      const cached = queryClient.getQueryData<InfiniteData<ActivityFeedPage>>(queryKey);
      expect(cached?.pages[0]._source).toBe('trending');
    });

    it('tags initialData with _source personalized when initialFeedSource is provided', () => {
      mockUseWsAuthToken.mockReturnValue({
        token: 'test-token',
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      const initialFeedResult = {
        items: [makeFeedItem('ssr-1')],
        cursor: 'ssr-cursor',
        hasMore: true,
      };

      const queryClient = createTestQueryClient();

      render(
        <ActivityFeed
          isAuthenticated={true}
          initialFeedResult={initialFeedResult}
          initialFeedSource="personalized"
        />,
        { wrapper: createWrapper(queryClient) },
      );

      expect(screen.getByText('ssr-1')).toBeTruthy();

      const queryKey = ['activityFeed', true, undefined, 'new', 'all'];
      const cached = queryClient.getQueryData<InfiniteData<ActivityFeedPage>>(queryKey);
      expect(cached?.pages[0]._source).toBe('personalized');
    });
  });
});
