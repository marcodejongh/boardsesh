import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '@/app/test-utils/test-providers';
import type { TrendingClimbItem } from '@boardsesh/shared-schema';

// --- Mocks ---

const mockRequest = vi.fn();
vi.mock('@/app/lib/graphql/client', () => ({
  createGraphQLHttpClient: () => ({ request: mockRequest }),
}));

vi.mock('@/app/hooks/use-ws-auth-token', () => ({
  useWsAuthToken: vi.fn(),
}));

vi.mock('@/app/lib/graphql/operations', () => ({
  GET_TRENDING_CLIMBS: 'GET_TRENDING_CLIMBS',
  GET_HOT_CLIMBS: 'GET_HOT_CLIMBS',
}));

vi.mock('@/app/hooks/use-infinite-scroll', () => ({
  useInfiniteScroll: () => ({ sentinelRef: { current: null } }),
}));

const mockReplace = vi.fn();
const mockSearchParams = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => '/',
}));

vi.mock('../trending-climb-card', () => ({
  default: ({ item, mode }: { item: TrendingClimbItem; mode: string }) => (
    <div data-testid="trending-climb-card" data-mode={mode}>
      {item.climbName}
    </div>
  ),
}));
vi.mock('../feed-item-skeleton', () => ({
  default: () => <div data-testid="feed-item-skeleton" />,
}));

import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import TrendingClimbFeed from '../trending-climb-feed';

const mockUseWsAuthToken = vi.mocked(useWsAuthToken);

// --- Helpers ---

function makeTrendingClimbItem(uuid: string, overrides?: Partial<TrendingClimbItem>): TrendingClimbItem {
  return {
    climbUuid: uuid,
    climbName: `Climb ${uuid}`,
    setterUsername: 'test-setter',
    boardType: 'kilter',
    layoutId: 1,
    angle: 40,
    frames: 'p1r12',
    difficultyName: 'V5',
    qualityAverage: 4.2,
    currentAscents: 100,
    ascentDelta: 15,
    ascentPctChange: 17.6,
    ...overrides,
  };
}

function createWrapper(queryClient?: QueryClient) {
  const client = queryClient ?? createTestQueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe('TrendingClimbFeed', () => {
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

      render(
        <TrendingClimbFeed isAuthenticated={false} mode="trending" />,
        { wrapper: createWrapper() },
      );

      expect(screen.getAllByTestId('feed-item-skeleton')).toHaveLength(3);
    });
  });

  describe('Trending mode', () => {
    beforeEach(() => {
      mockUseWsAuthToken.mockReturnValue({
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    });

    it('fetches trending climbs and renders cards', async () => {
      const items = [makeTrendingClimbItem('c1'), makeTrendingClimbItem('c2')];
      mockRequest.mockResolvedValueOnce({
        trendingClimbs: { items, totalCount: 2, hasMore: false },
      });

      render(
        <TrendingClimbFeed isAuthenticated={false} mode="trending" />,
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(screen.getAllByTestId('trending-climb-card')).toHaveLength(2);
      });

      expect(mockRequest).toHaveBeenCalledWith('GET_TRENDING_CLIMBS', expect.objectContaining({
        input: expect.objectContaining({ timePeriodDays: 7 }),
      }));
    });

    it('shows empty state when no results', async () => {
      mockRequest.mockResolvedValueOnce({
        trendingClimbs: { items: [], totalCount: 0, hasMore: false },
      });

      render(
        <TrendingClimbFeed isAuthenticated={false} mode="trending" />,
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(screen.getByText(/No trending climbs yet/)).toBeTruthy();
      });
    });
  });

  describe('Hot mode', () => {
    beforeEach(() => {
      mockUseWsAuthToken.mockReturnValue({
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    });

    it('fetches hot climbs and renders cards', async () => {
      const items = [makeTrendingClimbItem('h1'), makeTrendingClimbItem('h2')];
      mockRequest.mockResolvedValueOnce({
        hotClimbs: { items, totalCount: 2, hasMore: false },
      });

      render(
        <TrendingClimbFeed isAuthenticated={false} mode="hot" />,
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        const cards = screen.getAllByTestId('trending-climb-card');
        expect(cards).toHaveLength(2);
        expect(cards[0].getAttribute('data-mode')).toBe('hot');
      });

      expect(mockRequest).toHaveBeenCalledWith('GET_HOT_CLIMBS', expect.any(Object));
    });

    it('shows empty state when no results', async () => {
      mockRequest.mockResolvedValueOnce({
        hotClimbs: { items: [], totalCount: 0, hasMore: false },
      });

      render(
        <TrendingClimbFeed isAuthenticated={false} mode="hot" />,
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(screen.getByText(/No hot climbs yet/)).toBeTruthy();
      });
    });
  });

  describe('Board UUID filtering', () => {
    beforeEach(() => {
      mockUseWsAuthToken.mockReturnValue({
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    });

    it('passes boardUuid in query variables', async () => {
      mockRequest.mockResolvedValueOnce({
        trendingClimbs: { items: [], totalCount: 0, hasMore: false },
      });

      render(
        <TrendingClimbFeed isAuthenticated={false} mode="trending" boardUuid="board-123" />,
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(mockRequest).toHaveBeenCalledWith('GET_TRENDING_CLIMBS', expect.objectContaining({
          input: expect.objectContaining({ boardUuid: 'board-123' }),
        }));
      });
    });
  });

  describe('Time period selector', () => {
    it('renders 7d, 14d, 30d toggle buttons', () => {
      mockUseWsAuthToken.mockReturnValue({
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });

      mockRequest.mockResolvedValueOnce({
        trendingClimbs: { items: [], totalCount: 0, hasMore: false },
      });

      render(
        <TrendingClimbFeed isAuthenticated={false} mode="trending" />,
        { wrapper: createWrapper() },
      );

      expect(screen.getByText('7d')).toBeTruthy();
      expect(screen.getByText('14d')).toBeTruthy();
      expect(screen.getByText('30d')).toBeTruthy();
    });
  });

  describe('Error handling', () => {
    it('shows error state with retry button on fetch failure', async () => {
      mockUseWsAuthToken.mockReturnValue({
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });

      mockRequest.mockRejectedValueOnce(new Error('Network error'));

      render(
        <TrendingClimbFeed isAuthenticated={false} mode="trending" />,
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(screen.getByText(/Failed to load trending climbs/)).toBeTruthy();
      });

      expect(screen.getByText('Retry')).toBeTruthy();
    });
  });
});
