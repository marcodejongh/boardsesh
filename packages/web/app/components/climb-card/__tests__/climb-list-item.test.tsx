import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import type { Climb, BoardDetails } from '@/app/lib/types';

// --- Mocks ---

vi.mock('@/app/hooks/use-is-dark-mode', () => ({
  useIsDarkMode: () => false,
}));

vi.mock('../../graphql-queue', () => ({
  useOptionalQueueContext: () => null,
}));

vi.mock('../../climb-actions', () => ({
  useFavorite: () => ({
    isFavorited: false,
    isLoading: false,
    toggleFavorite: vi.fn(),
    isAuthenticated: false,
  }),
  ClimbActions: () => <div data-testid="climb-actions" />,
}));

vi.mock('@/app/hooks/use-swipe-actions', () => ({
  useSwipeActions: ({ disabled }: { disabled?: boolean }) => ({
    swipeHandlers: { ref: vi.fn() },
    contentRef: vi.fn(),
    leftActionRef: vi.fn(),
    rightActionRef: vi.fn(),
    _disabled: disabled,
  }),
}));

vi.mock('@/app/lib/hooks/use-double-tap', () => ({
  useDoubleTap: () => ({
    ref: vi.fn(),
    onDoubleClick: vi.fn(),
  }),
}));

vi.mock('@/app/lib/grade-colors', () => ({
  getSoftGradeColor: () => '#888',
  getGradeTintColor: () => null,
  extractVGrade: (d: string) => (d.startsWith('V') ? d : null),
}));

vi.mock('@/app/lib/climb-action-utils', () => ({
  getExcludedClimbActions: () => [],
}));

vi.mock('../climb-thumbnail', () => ({
  default: () => <div data-testid="climb-thumbnail" />,
}));

vi.mock('../drawer-climb-header', () => ({
  default: () => <div data-testid="drawer-climb-header" />,
}));

vi.mock('../../swipeable-drawer/swipeable-drawer', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="swipeable-drawer">{children}</div>,
}));

vi.mock('../../queue-control/queue-list-item', () => ({
  AscentStatus: () => <span data-testid="ascent-status" />,
}));

vi.mock('@/app/theme/theme-config', () => ({
  themeTokens: {
    spacing: { 1: 4, 2: 8, 3: 12, 4: 16, 16: 64 },
    colors: { error: '#B8524C', primary: '#8C4A52', success: '#6B9080' },
    neutral: { 200: '#E5E7EB', 400: '#9CA3AF', 500: '#6B7280' },
    typography: {
      fontSize: { xs: 12, sm: 14, xl: 20, '2xl': 24 },
      fontWeight: { semibold: 600, bold: 700 },
    },
  },
}));

import ClimbListItem from '../climb-list-item';

// --- Helpers ---

function makeClimb(overrides: Partial<Climb> = {}): Climb {
  return {
    uuid: 'climb-1',
    name: 'Test Boulder',
    setter_username: 'setter_joe',
    description: '',
    frames: 'p1r14',
    angle: 40,
    ascensionist_count: 10,
    difficulty: 'V4',
    quality_average: '3.5',
    stars: 0,
    difficulty_error: '0.5',
    litUpHoldsMap: {},
    benchmark_difficulty: null,
    ...overrides,
  };
}

function makeBoardDetails(overrides: Partial<BoardDetails> = {}): BoardDetails {
  return {
    board_name: 'kilter',
    layout_id: 1,
    size_id: 1,
    set_ids: '1',
    images_to_holds: {},
    holdsData: {},
    edge_left: 0,
    edge_right: 0,
    edge_bottom: 0,
    edge_top: 0,
    boardHeight: 100,
    boardWidth: 100,
    ...overrides,
  } as BoardDetails;
}

describe('ClimbListItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('basic rendering', () => {
    it('renders climb name', () => {
      render(<ClimbListItem climb={makeClimb({ name: 'Cool Route' })} boardDetails={makeBoardDetails()} />);
      expect(screen.getByText('Cool Route')).toBeTruthy();
    });

    it('renders setter username', () => {
      render(<ClimbListItem climb={makeClimb({ setter_username: 'alice' })} boardDetails={makeBoardDetails()} />);
      expect(screen.getByText(/alice/)).toBeTruthy();
    });

    it('renders V-grade', () => {
      render(<ClimbListItem climb={makeClimb({ difficulty: 'V5' })} boardDetails={makeBoardDetails()} />);
      expect(screen.getByText('V5')).toBeTruthy();
    });

    it('renders thumbnail', () => {
      render(<ClimbListItem climb={makeClimb()} boardDetails={makeBoardDetails()} />);
      expect(screen.getByTestId('climb-thumbnail')).toBeTruthy();
    });

    it('renders ellipsis menu button', () => {
      render(<ClimbListItem climb={makeClimb()} boardDetails={makeBoardDetails()} />);
      // There should be a button with the MoreHorizOutlined icon
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('disableSwipe behavior', () => {
    it('does not render swipe action backgrounds when disableSwipe is true', () => {
      render(
        <ClimbListItem climb={makeClimb()} boardDetails={makeBoardDetails()} disableSwipe />,
      );

      // Swipe icons (FavoriteBorderOutlined and AddOutlined) should not be in the DOM
      expect(screen.queryByTestId('FavoriteBorderOutlinedIcon')).toBeNull();
      expect(screen.queryByTestId('AddOutlinedIcon')).toBeNull();
    });

    it('renders swipe action backgrounds when disableSwipe is false/undefined', () => {
      render(
        <ClimbListItem climb={makeClimb()} boardDetails={makeBoardDetails()} />,
      );

      // Swipe icons should be present when swipe is enabled
      expect(screen.getByTestId('FavoriteBorderOutlinedIcon')).toBeTruthy();
      expect(screen.getByTestId('AddOutlinedIcon')).toBeTruthy();
    });

    it('renders ellipsis menu regardless of disableSwipe', () => {
      render(
        <ClimbListItem climb={makeClimb()} boardDetails={makeBoardDetails()} disableSwipe />,
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(1);
    });

    it('opens actions drawer on ellipsis click even with disableSwipe', () => {
      render(
        <ClimbListItem climb={makeClimb()} boardDetails={makeBoardDetails()} disableSwipe />,
      );

      // Click the ellipsis menu button
      const button = screen.getAllByRole('button')[0];
      fireEvent.click(button);

      // Actions drawer should now be mounted
      expect(screen.getByTestId('climb-actions')).toBeTruthy();
    });
  });
});
