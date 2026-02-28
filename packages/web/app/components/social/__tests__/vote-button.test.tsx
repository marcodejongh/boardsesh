import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';

// --- Mocks ---

const mockRequest = vi.fn();
vi.mock('@/app/lib/graphql/client', () => ({
  createGraphQLHttpClient: () => ({ request: mockRequest }),
}));

let mockAuthState = { token: 'test-token', isLoading: false, isAuthenticated: true, error: null };
vi.mock('@/app/hooks/use-ws-auth-token', () => ({
  useWsAuthToken: () => mockAuthState,
}));

vi.mock('@/app/components/providers/snackbar-provider', () => ({
  useSnackbar: () => ({ showMessage: vi.fn() }),
}));

vi.mock('@/app/lib/graphql/operations', () => ({
  VOTE: 'VOTE',
  GET_VOTE_SUMMARY: 'GET_VOTE_SUMMARY',
}));

vi.mock('@/app/theme/theme-config', () => ({
  themeTokens: {
    colors: { error: '#B8524C', success: '#6B9080' },
    typography: { fontSize: { xs: 12 } },
  },
}));

// Default: no context provided
let mockContextValue: { getVoteSummary: (id: string) => unknown } | null = null;
vi.mock('../vote-summary-context', () => ({
  useVoteSummaryContext: () => mockContextValue,
}));

import VoteButton from '../vote-button';

// --- Helpers ---

function renderVoteButton(props: Partial<React.ComponentProps<typeof VoteButton>> = {}) {
  return render(
    <VoteButton
      entityType="climb"
      entityId="climb-1"
      {...props}
    />,
  );
}

// --- Tests ---

describe('VoteButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest.mockReset();
    mockAuthState = { token: 'test-token', isLoading: false, isAuthenticated: true, error: null };
    mockContextValue = null;
  });

  describe('fetch behavior', () => {
    it('fetches vote summary on mount when no initialUserVote or context', async () => {
      mockRequest.mockResolvedValueOnce({
        voteSummary: { entityType: 'climb', entityId: 'climb-1', upvotes: 5, downvotes: 1, voteScore: 4, userVote: 1 },
      });

      renderVoteButton();

      await waitFor(() => {
        expect(mockRequest).toHaveBeenCalledWith(
          'GET_VOTE_SUMMARY',
          { entityType: 'climb', entityId: 'climb-1' },
        );
      });

      // After fetch, score should be 4 (5 upvotes - 1 downvote)
      await waitFor(() => {
        expect(screen.getByText('4')).toBeTruthy();
      });
    });

    it('skips fetch when initialUserVote is explicitly provided', async () => {
      renderVoteButton({ initialUserVote: 1, initialUpvotes: 3, initialDownvotes: 0 });

      // Give effect time to run
      await act(async () => {});

      expect(mockRequest).not.toHaveBeenCalled();
      // Score should be 3
      expect(screen.getByText('3')).toBeTruthy();
    });

    it('skips fetch when initialUserVote is 0 (explicitly provided)', async () => {
      renderVoteButton({ initialUserVote: 0 });

      await act(async () => {});

      expect(mockRequest).not.toHaveBeenCalled();
    });

    it('skips fetch when VoteSummaryProvider context is present', async () => {
      mockContextValue = {
        getVoteSummary: (id: string) =>
          id === 'climb-1'
            ? { entityType: 'climb', entityId: 'climb-1', upvotes: 2, downvotes: 0, voteScore: 2, userVote: 1 }
            : undefined,
      };

      renderVoteButton();

      await act(async () => {});

      // Should not fire individual fetch — context handles it
      expect(mockRequest).not.toHaveBeenCalled();
    });

    it('uses batch context data when available', async () => {
      mockContextValue = {
        getVoteSummary: (id: string) =>
          id === 'climb-1'
            ? { entityType: 'climb', entityId: 'climb-1', upvotes: 7, downvotes: 2, voteScore: 5, userVote: 1 }
            : undefined,
      };

      renderVoteButton();

      // Batch data should sync: score = 7 - 2 = 5
      await waitFor(() => {
        expect(screen.getByText('5')).toBeTruthy();
      });
    });

    it('does not fetch when user is not authenticated', async () => {
      mockAuthState = { token: null as unknown as string, isLoading: false, isAuthenticated: false, error: null };

      renderVoteButton();

      await act(async () => {});

      expect(mockRequest).not.toHaveBeenCalled();
    });
  });

  describe('race condition: hasVotedRef guard', () => {
    it('does not overwrite optimistic vote with stale fetch response', async () => {
      // Set up a slow fetch that returns userVote=0
      let resolveFetch: (value: unknown) => void;
      const fetchPromise = new Promise((resolve) => {
        resolveFetch = resolve;
      });
      mockRequest.mockImplementation((query: string) => {
        if (query === 'GET_VOTE_SUMMARY') return fetchPromise;
        // Vote mutation resolves immediately
        return Promise.resolve({
          vote: { entityType: 'climb', entityId: 'climb-1', upvotes: 1, downvotes: 0, voteScore: 1, userVote: 1 },
        });
      });

      renderVoteButton();

      // User clicks upvote before fetch completes
      fireEvent.click(screen.getByLabelText('Upvote'));

      // Score should optimistically be 1
      expect(screen.getByText('1')).toBeTruthy();

      // Now resolve the stale fetch with userVote=0 and score=0
      await act(async () => {
        resolveFetch!({
          voteSummary: { entityType: 'climb', entityId: 'climb-1', upvotes: 0, downvotes: 0, voteScore: 0, userVote: 0 },
        });
      });

      // Score should still be 1 (stale fetch should NOT have overwritten)
      expect(screen.getByText('1')).toBeTruthy();
    });
  });

  describe('likeOnly mode', () => {
    it('shows Unlike aria-label when userVote is 1 (filled heart)', () => {
      renderVoteButton({ likeOnly: true, initialUserVote: 1, initialUpvotes: 3 });

      expect(screen.getByLabelText('Unlike')).toBeTruthy();
      expect(screen.getByText('3')).toBeTruthy();
    });

    it('shows Like aria-label when userVote is 0 (outline heart)', () => {
      renderVoteButton({ likeOnly: true, initialUserVote: 0 });

      expect(screen.getByLabelText('Like')).toBeTruthy();
    });

    it('fetches and shows filled heart from batch context', async () => {
      mockContextValue = {
        getVoteSummary: (id: string) =>
          id === 'climb-1'
            ? { entityType: 'climb', entityId: 'climb-1', upvotes: 5, downvotes: 0, voteScore: 5, userVote: 1 }
            : undefined,
      };

      renderVoteButton({ likeOnly: true });

      await waitFor(() => {
        expect(screen.getByLabelText('Unlike')).toBeTruthy();
        expect(screen.getByText('5')).toBeTruthy();
      });
    });
  });
});
