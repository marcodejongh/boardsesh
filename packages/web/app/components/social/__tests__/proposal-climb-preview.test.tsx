import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import type { Proposal } from '@boardsesh/shared-schema';

// --- Mocks ---

vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

const mockGetDefaultBoardConfig = vi.fn();
vi.mock('@/app/lib/default-board-configs', () => ({
  getDefaultBoardConfig: (...args: unknown[]) => mockGetDefaultBoardConfig(...args),
}));

const mockGetBoardDetailsForBoard = vi.fn();
vi.mock('@/app/lib/board-utils', () => ({
  getBoardDetailsForBoard: (...args: unknown[]) => mockGetBoardDetailsForBoard(...args),
}));

vi.mock('@/app/components/board-renderer/util', () => ({
  convertLitUpHoldsStringToMap: vi.fn(() => ({
    0: { 123: { state: 'HAND', color: '#00FF00', displayColor: '#00FF00' } },
  })),
}));

vi.mock('@/app/components/board-renderer/board-renderer', () => ({
  default: () => <div data-testid="board-renderer" />,
}));

vi.mock('@/app/theme/theme-config', () => ({
  themeTokens: {
    neutral: {
      50: '#F9FAFB',
      100: '#F3F4F6',
      200: '#E5E7EB',
      500: '#6B7280',
      600: '#4B5563',
      800: '#1F2937',
    },
    colors: {
      primary: '#8C4A52',
    },
  },
}));

import ProposalClimbPreview from '../proposal-climb-preview';

// --- Helpers ---

const mockBoardDetails = {
  board_name: 'kilter' as const,
  layout_id: 1,
  size_id: 7,
  set_ids: [1, 20],
  layout_name: 'Original',
  size_name: '12 x 14',
  size_description: 'Commercial',
  set_names: ['Bolt Ons', 'Screw Ons'],
  images_to_holds: {},
  holdsData: [],
  edge_left: 0,
  edge_right: 100,
  edge_bottom: 0,
  edge_top: 100,
  boardHeight: 100,
  boardWidth: 100,
};

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
    climbName: 'Test Climb',
    frames: 'p123r14p456r15',
    layoutId: 1,
    ...overrides,
  };
}

describe('ProposalClimbPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDefaultBoardConfig.mockReturnValue({ sizeId: 7, setIds: [1, 20] });
    mockGetBoardDetailsForBoard.mockReturnValue(mockBoardDetails);
  });

  describe('Rendering', () => {
    it('renders climb name', () => {
      render(<ProposalClimbPreview proposal={makeProposal()} />);
      expect(screen.getByTestId('proposal-climb-name').textContent).toBe('Test Climb');
    });

    it('renders board type', () => {
      render(<ProposalClimbPreview proposal={makeProposal()} />);
      expect(screen.getByText('kilter')).toBeTruthy();
    });

    it('renders angle chip when angle is present', () => {
      render(<ProposalClimbPreview proposal={makeProposal({ angle: 45 })} />);
      expect(screen.getByTestId('proposal-climb-angle').textContent).toBe('45°');
    });

    it('does not render angle chip when angle is null', () => {
      render(<ProposalClimbPreview proposal={makeProposal({ angle: null })} />);
      expect(screen.queryByTestId('proposal-climb-angle')).toBeNull();
    });

    it('renders angle chip for angle 0', () => {
      // angle=0 is a valid angle, should still be displayed
      // Note: 0 is falsy in JS but angle != null check handles this correctly
      render(<ProposalClimbPreview proposal={makeProposal({ angle: 0 })} />);
      expect(screen.getByTestId('proposal-climb-angle').textContent).toBe('0°');
    });

    it('renders board thumbnail when board details and frames are available', () => {
      render(<ProposalClimbPreview proposal={makeProposal()} />);
      expect(screen.getByTestId('proposal-climb-thumbnail')).toBeTruthy();
      expect(screen.getByTestId('board-renderer')).toBeTruthy();
    });

    it('does not render thumbnail when layoutId is missing', () => {
      render(<ProposalClimbPreview proposal={makeProposal({ layoutId: null })} />);
      expect(screen.queryByTestId('proposal-climb-thumbnail')).toBeNull();
    });

    it('does not render thumbnail when frames are missing', () => {
      render(<ProposalClimbPreview proposal={makeProposal({ frames: null })} />);
      expect(screen.queryByTestId('proposal-climb-thumbnail')).toBeNull();
    });

    it('does not render thumbnail when default board config is unavailable', () => {
      mockGetDefaultBoardConfig.mockReturnValue(null);
      render(<ProposalClimbPreview proposal={makeProposal()} />);
      expect(screen.queryByTestId('proposal-climb-thumbnail')).toBeNull();
    });

    it('does not render thumbnail when getBoardDetailsForBoard throws', () => {
      mockGetBoardDetailsForBoard.mockImplementation(() => {
        throw new Error('Board not found');
      });
      render(<ProposalClimbPreview proposal={makeProposal()} />);
      expect(screen.queryByTestId('proposal-climb-thumbnail')).toBeNull();
    });
  });

  describe('Navigation', () => {
    it('renders as a link to climb view page', () => {
      render(<ProposalClimbPreview proposal={makeProposal()} />);
      const link = screen.getByTestId('proposal-climb-link');
      expect(link).toBeTruthy();
      expect(link.tagName).toBe('A');
      // Should contain the board name, layout slug, and climb UUID
      expect(link.getAttribute('href')).toContain('kilter');
      expect(link.getAttribute('href')).toContain('climb-abc123');
    });

    it('uses slug-based URL when slug data is available', () => {
      render(<ProposalClimbPreview proposal={makeProposal()} />);
      const link = screen.getByTestId('proposal-climb-link');
      const href = link.getAttribute('href')!;
      // Should use slug-based URL construction when layout_name etc. are available
      expect(href).toContain('/kilter/');
      expect(href).toContain('/40/view/');
      expect(href).toContain('climb-abc123');
    });

    it('falls back to numeric URL when slug data is missing', () => {
      const detailsNoSlugs = { ...mockBoardDetails, layout_name: undefined, size_name: undefined, set_names: undefined };
      mockGetBoardDetailsForBoard.mockReturnValue(detailsNoSlugs);

      render(<ProposalClimbPreview proposal={makeProposal()} />);
      const link = screen.getByTestId('proposal-climb-link');
      const href = link.getAttribute('href')!;
      expect(href).toContain('/kilter/');
      expect(href).toContain('climb-abc123');
    });

    it('does not render a link when angle is missing', () => {
      render(<ProposalClimbPreview proposal={makeProposal({ angle: null })} />);
      expect(screen.queryByTestId('proposal-climb-link')).toBeNull();
      // Should still render the preview without link
      expect(screen.getByTestId('proposal-climb-preview')).toBeTruthy();
    });

    it('does not render a link when layoutId is missing', () => {
      render(<ProposalClimbPreview proposal={makeProposal({ layoutId: null })} />);
      expect(screen.queryByTestId('proposal-climb-link')).toBeNull();
      // Should still render the climb name without link
      expect(screen.getByTestId('proposal-climb-name')).toBeTruthy();
    });

    it('includes climb name in URL as a slug', () => {
      render(<ProposalClimbPreview proposal={makeProposal({ climbName: 'My Cool Climb' })} />);
      const link = screen.getByTestId('proposal-climb-link');
      const href = link.getAttribute('href')!;
      expect(href).toContain('my-cool-climb');
    });
  });

  describe('Empty state', () => {
    it('returns null when climbName and frames are both missing', () => {
      const { container } = render(
        <ProposalClimbPreview proposal={makeProposal({ climbName: null, frames: null })} />,
      );
      expect(container.innerHTML).toBe('');
    });

    it('renders when only climbName is available (no frames)', () => {
      render(<ProposalClimbPreview proposal={makeProposal({ frames: null })} />);
      expect(screen.getByTestId('proposal-climb-name').textContent).toBe('Test Climb');
    });

    it('renders when only frames are available (no climbName)', () => {
      render(<ProposalClimbPreview proposal={makeProposal({ climbName: null })} />);
      expect(screen.getByTestId('proposal-climb-preview')).toBeTruthy();
      expect(screen.queryByTestId('proposal-climb-name')).toBeNull();
    });
  });

  describe('Board details resolution', () => {
    it('passes correct params to getDefaultBoardConfig', () => {
      render(<ProposalClimbPreview proposal={makeProposal({ boardType: 'tension', layoutId: 9 })} />);
      expect(mockGetDefaultBoardConfig).toHaveBeenCalledWith('tension', 9);
    });

    it('passes correct params to getBoardDetailsForBoard', () => {
      mockGetDefaultBoardConfig.mockReturnValue({ sizeId: 3, setIds: [5, 6] });
      render(<ProposalClimbPreview proposal={makeProposal({ boardType: 'tension', layoutId: 9 })} />);
      expect(mockGetBoardDetailsForBoard).toHaveBeenCalledWith({
        board_name: 'tension',
        layout_id: 9,
        size_id: 3,
        set_ids: [5, 6],
      });
    });
  });
});
