import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import type { Proposal } from '@boardsesh/shared-schema';

// --- Mocks ---

const mockRequest = vi.fn();
vi.mock('@/app/lib/graphql/client', () => ({
  createGraphQLHttpClient: () => ({ request: mockRequest }),
}));

vi.mock('@/app/hooks/use-ws-auth-token', () => ({
  useWsAuthToken: () => ({ token: 'test-token', isLoading: false, isAuthenticated: true, error: null }),
}));

vi.mock('@/app/lib/graphql/operations/proposals', () => ({
  VOTE_ON_PROPOSAL: 'VOTE_ON_PROPOSAL',
  RESOLVE_PROPOSAL: 'RESOLVE_PROPOSAL',
  DELETE_PROPOSAL: 'DELETE_PROPOSAL',
}));

// Mock ProposalClimbPreview to verify it receives the correct props
const mockClimbPreview = vi.fn();
vi.mock('../proposal-climb-preview', () => ({
  default: (props: { proposal: Proposal }) => {
    mockClimbPreview(props);
    return (
      <div data-testid="proposal-climb-preview-mock">
        {props.proposal.climbName && <span data-testid="preview-climb-name">{props.proposal.climbName}</span>}
        {props.proposal.angle != null && <span data-testid="preview-angle">{props.proposal.angle}</span>}
      </div>
    );
  },
}));

vi.mock('../proposal-vote-bar', () => ({
  default: () => <div data-testid="proposal-vote-bar" />,
}));

vi.mock('../comment-section', () => ({
  default: () => <div data-testid="comment-section" />,
}));

vi.mock('@/app/theme/theme-config', () => ({
  themeTokens: {
    neutral: {
      50: '#F9FAFB',
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      800: '#1F2937',
    },
    colors: {
      primary: '#8C4A52',
      success: '#6B9080',
      error: '#B8524C',
      amber: '#FBBF24',
      purple: '#7C3AED',
    },
  },
}));

import ProposalCard from '../proposal-card';

// --- Helpers ---

function makeProposal(overrides: Partial<Proposal> = {}): Proposal {
  return {
    uuid: 'proposal-1',
    climbUuid: 'climb-abc123',
    boardType: 'kilter',
    angle: 40,
    proposerId: 'user-1',
    proposerDisplayName: 'Test User',
    proposerAvatarUrl: null,
    type: 'grade',
    proposedValue: 'V5',
    currentValue: 'V4',
    status: 'open',
    reason: null,
    resolvedAt: null,
    resolvedBy: null,
    createdAt: '2024-01-15T10:00:00.000Z',
    weightedUpvotes: 3,
    weightedDownvotes: 0,
    requiredUpvotes: 5,
    userVote: 0,
    climbName: 'Test Boulder',
    frames: 'p123r14p456r15',
    layoutId: 1,
    ...overrides,
  };
}

describe('ProposalCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest.mockReset();
  });

  describe('Climb preview integration', () => {
    it('renders ProposalClimbPreview component', () => {
      render(<ProposalCard proposal={makeProposal()} />);
      expect(screen.getByTestId('proposal-climb-preview-mock')).toBeTruthy();
    });

    it('passes the full proposal to ProposalClimbPreview', () => {
      const proposal = makeProposal({ climbName: 'My Boulder', angle: 45 });
      render(<ProposalCard proposal={proposal} />);
      expect(mockClimbPreview).toHaveBeenCalledWith(
        expect.objectContaining({
          proposal: expect.objectContaining({
            climbName: 'My Boulder',
            angle: 45,
            climbUuid: 'climb-abc123',
            boardType: 'kilter',
            frames: 'p123r14p456r15',
            layoutId: 1,
          }),
        }),
      );
    });

    it('shows preview with climb name when available', () => {
      render(<ProposalCard proposal={makeProposal({ climbName: 'Moonlight Sonata' })} />);
      expect(screen.getByTestId('preview-climb-name').textContent).toBe('Moonlight Sonata');
    });

    it('shows preview with angle when available', () => {
      render(<ProposalCard proposal={makeProposal({ angle: 45 })} />);
      expect(screen.getByTestId('preview-angle').textContent).toBe('45');
    });

    it('renders preview without climb name when not available', () => {
      render(<ProposalCard proposal={makeProposal({ climbName: null })} />);
      expect(screen.getByTestId('proposal-climb-preview-mock')).toBeTruthy();
      expect(screen.queryByTestId('preview-climb-name')).toBeNull();
    });

    it('renders preview without angle when not available', () => {
      render(<ProposalCard proposal={makeProposal({ angle: null })} />);
      expect(screen.getByTestId('proposal-climb-preview-mock')).toBeTruthy();
      expect(screen.queryByTestId('preview-angle')).toBeNull();
    });
  });

  describe('Basic rendering', () => {
    it('renders the card with data-testid', () => {
      render(<ProposalCard proposal={makeProposal()} />);
      expect(screen.getByTestId('proposal-card')).toBeTruthy();
    });

    it('displays proposer name', () => {
      render(<ProposalCard proposal={makeProposal({ proposerDisplayName: 'Alice' })} />);
      expect(screen.getByText('Alice')).toBeTruthy();
    });

    it('displays type chip', () => {
      render(<ProposalCard proposal={makeProposal({ type: 'grade' })} />);
      expect(screen.getByText('Grade')).toBeTruthy();
    });

    it('displays value change chips', () => {
      render(<ProposalCard proposal={makeProposal({ currentValue: 'V3', proposedValue: 'V5' })} />);
      expect(screen.getByText('V3')).toBeTruthy();
      expect(screen.getByText('V5')).toBeTruthy();
    });

    it('displays reason when provided', () => {
      render(<ProposalCard proposal={makeProposal({ reason: 'Feels way harder' })} />);
      expect(screen.getByText(/Feels way harder/)).toBeTruthy();
    });

    it('does not display reason when not provided', () => {
      render(<ProposalCard proposal={makeProposal({ reason: null })} />);
      expect(screen.queryByText(/Feels/)).toBeNull();
    });

    it('displays timestamp', () => {
      render(<ProposalCard proposal={makeProposal()} />);
      // Date formatted as locale date string
      expect(screen.getByText(/2024/)).toBeTruthy();
    });

    it('renders vote bar', () => {
      render(<ProposalCard proposal={makeProposal()} />);
      expect(screen.getByTestId('proposal-vote-bar')).toBeTruthy();
    });
  });

  describe('Voting', () => {
    it('updates proposal state after successful vote', async () => {
      const updatedProposal = makeProposal({ userVote: 1, weightedUpvotes: 4 });
      mockRequest.mockResolvedValueOnce({ voteOnProposal: updatedProposal });

      const onUpdate = vi.fn();
      render(<ProposalCard proposal={makeProposal()} onUpdate={onUpdate} />);

      // Click the upvote button (Support)
      const supportButton = screen.getByRole('button', { name: /support/i });
      fireEvent.click(supportButton);

      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalledWith(updatedProposal);
      });
    });
  });

  describe('Admin actions', () => {
    it('shows approve/reject buttons for admin', () => {
      render(<ProposalCard proposal={makeProposal()} isAdminOrLeader />);
      expect(screen.getByText('Approve')).toBeTruthy();
      expect(screen.getByText('Reject')).toBeTruthy();
    });

    it('does not show approve/reject buttons for non-admin', () => {
      render(<ProposalCard proposal={makeProposal()} />);
      expect(screen.queryByText('Approve')).toBeNull();
      expect(screen.queryByText('Reject')).toBeNull();
    });

    it('shows delete button for approved proposals when admin', () => {
      render(<ProposalCard proposal={makeProposal({ status: 'approved' })} isAdminOrLeader />);
      expect(screen.getByText('Delete Proposal')).toBeTruthy();
    });

    it('does not show vote buttons for non-open proposals', () => {
      render(<ProposalCard proposal={makeProposal({ status: 'approved' })} />);
      expect(screen.queryByRole('button', { name: /support/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /oppose/i })).toBeNull();
    });
  });

  describe('Comments', () => {
    it('toggles comment section on button click', () => {
      render(<ProposalCard proposal={makeProposal()} />);

      // Comment section should not be visible initially
      expect(screen.queryByTestId('comment-section')).toBeNull();

      // Click comments button
      fireEvent.click(screen.getByText('Comments'));

      // Comment section should now be visible
      expect(screen.getByTestId('comment-section')).toBeTruthy();
    });
  });

  describe('Preview updates with vote', () => {
    it('preserves climb data when proposal updates after vote', async () => {
      const originalProposal = makeProposal({
        climbName: 'Original Climb',
        frames: 'p1r14',
        layoutId: 1,
      });
      const updatedProposal = {
        ...originalProposal,
        userVote: 1,
        weightedUpvotes: 4,
      };
      mockRequest.mockResolvedValueOnce({ voteOnProposal: updatedProposal });

      render(<ProposalCard proposal={originalProposal} />);

      // Click vote
      fireEvent.click(screen.getByRole('button', { name: /support/i }));

      await waitFor(() => {
        // The climb preview should still show the climb name after the vote update
        expect(screen.getByTestId('preview-climb-name').textContent).toBe('Original Climb');
      });
    });
  });
});
