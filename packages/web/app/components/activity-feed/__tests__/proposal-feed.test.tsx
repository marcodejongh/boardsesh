import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '@/app/test-utils/test-providers';
import type { Proposal } from '@boardsesh/shared-schema';

// --- Mocks ---

const mockRequest = vi.fn();
vi.mock('@/app/lib/graphql/client', () => ({
  createGraphQLHttpClient: () => ({ request: mockRequest }),
}));

vi.mock('@/app/hooks/use-ws-auth-token', () => ({
  useWsAuthToken: vi.fn(),
}));

vi.mock('@/app/lib/graphql/operations/proposals', () => ({
  BROWSE_PROPOSALS: 'BROWSE_PROPOSALS',
}));

vi.mock('@/app/hooks/use-infinite-scroll', () => ({
  useInfiniteScroll: () => ({ sentinelRef: { current: null } }),
}));

vi.mock('@/app/components/social/proposal-card', () => ({
  default: ({ proposal }: { proposal: Proposal }) => (
    <div data-testid="proposal-card">{proposal.uuid}</div>
  ),
}));

vi.mock('../feed-item-skeleton', () => ({
  default: () => <div data-testid="feed-item-skeleton" />,
}));

import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import ProposalFeed from '../proposal-feed';

const mockUseWsAuthToken = vi.mocked(useWsAuthToken);

// --- Helpers ---

function makeProposal(uuid: string): Proposal {
  return {
    uuid,
    climbUuid: 'climb-1',
    boardType: 'kilter',
    angle: 40,
    proposerId: 'user-1',
    proposerDisplayName: 'Test User',
    proposerAvatarUrl: null,
    type: 'grade',
    proposedValue: 'V5',
    currentValue: 'V4',
    status: 'open',
    reason: 'Feels harder',
    resolvedAt: null,
    resolvedBy: null,
    createdAt: '2024-01-15T10:00:00.000Z',
    weightedUpvotes: 3,
    weightedDownvotes: 0,
    requiredUpvotes: 5,
    userVote: 0,
  };
}

function createWrapper(queryClient?: QueryClient) {
  const client = queryClient ?? createTestQueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe('ProposalFeed', () => {
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

      render(<ProposalFeed isAuthenticated={false} />, { wrapper: createWrapper() });

      expect(screen.getAllByTestId('feed-item-skeleton')).toHaveLength(3);
    });
  });

  describe('Data fetching', () => {
    beforeEach(() => {
      mockUseWsAuthToken.mockReturnValue({
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    });

    it('fetches and renders proposal cards', async () => {
      const proposals = [makeProposal('p1'), makeProposal('p2')];
      mockRequest.mockResolvedValueOnce({
        browseProposals: { proposals, totalCount: 2, hasMore: false },
      });

      render(<ProposalFeed isAuthenticated={false} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getAllByTestId('proposal-feed-item')).toHaveLength(2);
      });

      expect(mockRequest).toHaveBeenCalledTimes(1);
      expect(mockRequest).toHaveBeenCalledWith('BROWSE_PROPOSALS', expect.any(Object));
    });

    it('shows empty state when no proposals', async () => {
      mockRequest.mockResolvedValueOnce({
        browseProposals: { proposals: [], totalCount: 0, hasMore: false },
      });

      render(<ProposalFeed isAuthenticated={false} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/No proposals yet/)).toBeTruthy();
      });
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
        browseProposals: { proposals: [], totalCount: 0, hasMore: false },
      });

      render(
        <ProposalFeed isAuthenticated={false} boardUuid="board-123" />,
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(mockRequest).toHaveBeenCalledWith(
          'BROWSE_PROPOSALS',
          expect.objectContaining({
            input: expect.objectContaining({ boardUuid: 'board-123' }),
          }),
        );
      });
    });
  });

  describe('Error state', () => {
    it('shows error state with retry button on failure', async () => {
      mockUseWsAuthToken.mockReturnValue({
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });

      mockRequest.mockRejectedValueOnce(new Error('Network error'));

      render(<ProposalFeed isAuthenticated={false} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Failed to load proposals/)).toBeTruthy();
      });

      expect(screen.getByText('Retry')).toBeTruthy();
    });
  });
});
