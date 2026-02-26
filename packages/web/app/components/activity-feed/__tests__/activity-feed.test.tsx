import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '@/app/test-utils/test-providers';
import type { SessionFeedItem } from '@boardsesh/shared-schema';

// --- Mocks ---

const mockRequest = vi.fn();
vi.mock('@/app/lib/graphql/client', () => ({
  createGraphQLHttpClient: () => ({ request: mockRequest }),
}));

vi.mock('@/app/hooks/use-ws-auth-token', () => ({
  useWsAuthToken: vi.fn(),
}));

vi.mock('@/app/lib/graphql/operations', () => ({
  GET_SESSION_GROUPED_FEED: 'GET_SESSION_GROUPED_FEED',
}));

vi.mock('@/app/hooks/use-infinite-scroll', () => ({
  useInfiniteScroll: () => ({ sentinelRef: { current: null } }),
}));

vi.mock('../session-feed-card', () => ({
  default: ({ session }: { session: SessionFeedItem }) => (
    <div data-testid="session-feed-card">{session.sessionId}</div>
  ),
}));
vi.mock('../feed-item-skeleton', () => ({
  default: () => <div data-testid="feed-item-skeleton" />,
}));

import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import ActivityFeed from '../activity-feed';

const mockUseWsAuthToken = vi.mocked(useWsAuthToken);

// --- Helpers ---

function makeSessionFeedItem(id: string): SessionFeedItem {
  return {
    sessionId: id,
    sessionType: 'inferred',
    sessionName: null,
    participants: [{
      userId: 'user-1',
      displayName: 'Test User',
      avatarUrl: null,
      sends: 3,
      flashes: 1,
      attempts: 2,
    }],
    totalSends: 3,
    totalFlashes: 1,
    totalAttempts: 2,
    tickCount: 5,
    gradeDistribution: [{ grade: 'V5', flash: 1, send: 2, attempt: 2 }],
    boardTypes: ['kilter'],
    hardestGrade: 'V5',
    firstTickAt: '2024-01-15T10:00:00.000Z',
    lastTickAt: '2024-01-15T12:00:00.000Z',
    durationMinutes: 120,
    goal: null,
    upvotes: 0,
    downvotes: 0,
    voteScore: 0,
    commentCount: 0,
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

    it('fetches sessionGroupedFeed and renders session cards', async () => {
      const sessions = [makeSessionFeedItem('s1'), makeSessionFeedItem('s2')];
      mockRequest.mockResolvedValueOnce({
        sessionGroupedFeed: { sessions, cursor: null, hasMore: false },
      });

      render(<ActivityFeed isAuthenticated={false} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getAllByTestId('session-feed-card')).toHaveLength(2);
      });

      expect(mockRequest).toHaveBeenCalledTimes(1);
      expect(mockRequest).toHaveBeenCalledWith('GET_SESSION_GROUPED_FEED', expect.any(Object));
    });

    it('shows sign-in alert for unauthenticated users', async () => {
      mockRequest.mockResolvedValueOnce({
        sessionGroupedFeed: { sessions: [makeSessionFeedItem('s1')], cursor: null, hasMore: false },
      });

      render(<ActivityFeed isAuthenticated={false} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Sign in to see a personalized feed/)).toBeTruthy();
      });
    });

    it('shows empty state when no sessions', async () => {
      mockRequest.mockResolvedValueOnce({
        sessionGroupedFeed: { sessions: [], cursor: null, hasMore: false },
      });

      render(<ActivityFeed isAuthenticated={false} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/No recent activity yet/)).toBeTruthy();
      });
    });
  });

  describe('Authenticated', () => {
    beforeEach(() => {
      mockUseWsAuthToken.mockReturnValue({
        token: 'test-token',
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    });

    it('fetches and renders session cards', async () => {
      const sessions = [makeSessionFeedItem('p1'), makeSessionFeedItem('p2')];
      mockRequest.mockResolvedValueOnce({
        sessionGroupedFeed: { sessions, cursor: 'cursor-1', hasMore: true },
      });

      render(<ActivityFeed isAuthenticated={true} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getAllByTestId('session-feed-card')).toHaveLength(2);
      });

      expect(mockRequest).toHaveBeenCalledTimes(1);
    });

    it('shows empty state with find climbers button', async () => {
      const onFindClimbers = vi.fn();
      mockRequest.mockResolvedValueOnce({
        sessionGroupedFeed: { sessions: [], cursor: null, hasMore: false },
      });

      render(
        <ActivityFeed isAuthenticated={true} onFindClimbers={onFindClimbers} />,
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(screen.getByText(/Follow climbers/)).toBeTruthy();
      });
    });
  });

  describe('initialData', () => {
    it('renders SSR-provided session data immediately', () => {
      mockUseWsAuthToken.mockReturnValue({
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });

      const initialFeedResult = {
        sessions: [makeSessionFeedItem('init-1')],
        cursor: 'init-cursor',
        hasMore: true,
      };

      render(
        <ActivityFeed isAuthenticated={false} initialFeedResult={initialFeedResult} />,
        { wrapper: createWrapper() },
      );

      expect(screen.getByText('init-1')).toBeTruthy();
    });
  });

  describe('Board filter', () => {
    it('passes boardUuid to the query', async () => {
      mockUseWsAuthToken.mockReturnValue({
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });

      mockRequest.mockResolvedValueOnce({
        sessionGroupedFeed: { sessions: [], cursor: null, hasMore: false },
      });

      render(
        <ActivityFeed isAuthenticated={false} boardUuid="board-123" />,
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(mockRequest).toHaveBeenCalledWith(
          'GET_SESSION_GROUPED_FEED',
          expect.objectContaining({
            input: expect.objectContaining({ boardUuid: 'board-123' }),
          }),
        );
      });
    });
  });
});
