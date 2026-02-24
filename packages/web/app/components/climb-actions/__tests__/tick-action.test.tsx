import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor, renderHook } from '@testing-library/react';
import React, { useState } from 'react';

// Mock window.matchMedia for ActionTooltip component
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

vi.mock('@vercel/analytics', () => ({
  track: vi.fn(),
}));

const mockSaveTick = vi.fn();
vi.mock('../../board-provider/board-provider-context', () => ({
  useBoardProvider: vi.fn(),
}));

vi.mock('../../auth/auth-modal', () => ({
  __esModule: true,
  default: ({ open, onClose, title }: any) =>
    open ? React.createElement('div', { 'data-testid': 'auth-modal' }, title) : null,
}));

vi.mock('../../logbook/log-ascent-drawer', () => ({
  LogAscentDrawer: ({ open, onClose }: any) =>
    open ? React.createElement('div', { 'data-testid': 'log-ascent-drawer' }, 'LogAscentDrawer') : null,
}));

vi.mock('../../swipeable-drawer/swipeable-drawer', () => ({
  __esModule: true,
  default: ({ open, children, title }: any) =>
    open ? React.createElement('div', { 'data-testid': 'sign-in-drawer' }, [
      React.createElement('span', { key: 'title' }, title),
      children,
    ]) : null,
}));

vi.mock('@/app/hooks/use-always-tick-in-app', () => ({
  useAlwaysTickInApp: vi.fn(),
}));

vi.mock('@/app/lib/url-utils', () => ({
  constructClimbInfoUrl: vi.fn(() => 'https://app.example.com/climb'),
}));

vi.mock('@/app/theme/theme-config', () => ({
  themeTokens: {
    colors: { success: '#00ff00', error: '#ff0000', primary: '#0000ff' },
    spacing: { 4: 16 },
    typography: { fontSize: { base: 14 } },
  },
}));

import { useBoardProvider } from '../../board-provider/board-provider-context';
import { useAlwaysTickInApp } from '@/app/hooks/use-always-tick-in-app';
import { TickAction } from '../actions/tick-action';
import type { Climb, BoardDetails } from '@/app/lib/types';
import type { ClimbActionProps, ClimbActionResult } from '../types';

const mockUseBoardProvider = vi.mocked(useBoardProvider);
const mockUseAlwaysTickInApp = vi.mocked(useAlwaysTickInApp);

const mockClimb: Climb = {
  uuid: 'climb-uuid-1',
  setter_username: 'setter1',
  name: 'Test Climb',
  description: 'A test climb',
  frames: '',
  angle: 40,
  ascensionist_count: 5,
  difficulty: 'V5',
  quality_average: '3.5',
  stars: 3,
  difficulty_error: '',
  litUpHoldsMap: {},
  mirrored: false,
  benchmark_difficulty: null,
  userAscents: 0,
  userAttempts: 0,
};

const mockBoardDetails: BoardDetails = {
  board_name: 'kilter',
  layout_id: 1,
  layout_name: 'Original',
  size_id: 1,
  size_name: '12x12',
  set_ids: [1, 2],
  set_names: ['Bolt Ons', 'Screw Ons'],
  supportsMirroring: true,
  angle: 40,
  image_url: '',
  edge_left: 0,
  edge_right: 0,
  edge_bottom: 0,
  edge_top: 0,
} as BoardDetails;

const logbookEntry = (overrides: Record<string, unknown> = {}) => ({
  uuid: 'tick-1',
  climb_uuid: 'climb-uuid-1',
  angle: 40,
  is_mirror: false,
  user_id: 0,
  attempt_id: 0,
  tries: 1,
  quality: 3,
  difficulty: 14,
  is_benchmark: false,
  is_listed: true,
  comment: '',
  climbed_at: '2024-01-01',
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  wall_uuid: null,
  is_ascent: true,
  status: 'flash' as const,
  ...overrides,
});

/**
 * Wrapper component that calls TickAction (which uses hooks) inside a React render context,
 * then renders the returned element and exposes the result via data attributes.
 */
function TickActionWrapper(props: ClimbActionProps) {
  const result = TickAction(props);
  return (
    <div data-testid="tick-action-wrapper" data-available={result.available} data-key={result.key} data-menu-label={result.menuItem.label}>
      {result.element}
    </div>
  );
}

describe('TickAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSaveTick.mockResolvedValue(undefined);
    mockUseBoardProvider.mockReturnValue({
      saveTick: mockSaveTick,
      isAuthenticated: true,
      logbook: [],
      getLogbook: vi.fn(),
      saveClimb: vi.fn(),
      isLoading: false,
      error: null,
      isInitialized: true,
      boardName: 'kilter',
    });
    mockUseAlwaysTickInApp.mockReturnValue({
      alwaysUseApp: false,
      loaded: true,
      enableAlwaysUseApp: vi.fn(),
    });
  });

  it('returns available=true and key=tick', () => {
    render(
      <TickActionWrapper
        climb={mockClimb}
        boardDetails={mockBoardDetails}
        angle={40}
        viewMode="icon"
      />,
    );

    const wrapper = screen.getByTestId('tick-action-wrapper');
    expect(wrapper.dataset.available).toBe('true');
    expect(wrapper.dataset.key).toBe('tick');
  });

  it('renders LogAscentDrawer when authenticated and clicked', async () => {
    render(
      <TickActionWrapper
        climb={mockClimb}
        boardDetails={mockBoardDetails}
        angle={40}
        viewMode="button"
      />,
    );

    const button = screen.getByText('Tick');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByTestId('log-ascent-drawer')).toBeDefined();
    });
  });

  it('renders sign-in drawer when not authenticated and clicked', async () => {
    mockUseBoardProvider.mockReturnValue({
      saveTick: mockSaveTick,
      isAuthenticated: false,
      logbook: [],
      getLogbook: vi.fn(),
      saveClimb: vi.fn(),
      isLoading: false,
      error: null,
      isInitialized: true,
      boardName: 'kilter',
    });

    render(
      <TickActionWrapper
        climb={mockClimb}
        boardDetails={mockBoardDetails}
        angle={40}
        viewMode="button"
      />,
    );

    const button = screen.getByText('Tick');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByTestId('sign-in-drawer')).toBeDefined();
    });

    expect(screen.getByText('Sign in to record ticks')).toBeDefined();
  });

  it('shows badge with logbook count', () => {
    mockUseBoardProvider.mockReturnValue({
      saveTick: mockSaveTick,
      isAuthenticated: true,
      logbook: [logbookEntry()],
      getLogbook: vi.fn(),
      saveClimb: vi.fn(),
      isLoading: false,
      error: null,
      isInitialized: true,
      boardName: 'kilter',
    });

    const { container } = render(
      <TickActionWrapper
        climb={mockClimb}
        boardDetails={mockBoardDetails}
        angle={40}
        viewMode="button"
      />,
    );

    const badge = container.querySelector('.MuiBadge-badge');
    expect(badge?.textContent).toBe('1');
  });

  it('filters logbook entries by angle', () => {
    mockUseBoardProvider.mockReturnValue({
      saveTick: mockSaveTick,
      isAuthenticated: true,
      logbook: [
        logbookEntry({ angle: 40 }),
        logbookEntry({ uuid: 'tick-2', angle: 20 }), // Different angle
      ],
      getLogbook: vi.fn(),
      saveClimb: vi.fn(),
      isLoading: false,
      error: null,
      isInitialized: true,
      boardName: 'kilter',
    });

    const { container } = render(
      <TickActionWrapper
        climb={mockClimb}
        boardDetails={mockBoardDetails}
        angle={40}
        viewMode="button"
      />,
    );

    // Should only show badge for angle 40
    const badge = container.querySelector('.MuiBadge-badge');
    expect(badge?.textContent).toBe('1');
  });

  it('provides menu item config for dropdown mode', () => {
    render(
      <TickActionWrapper
        climb={mockClimb}
        boardDetails={mockBoardDetails}
        angle={40}
        viewMode="dropdown"
      />,
    );

    const wrapper = screen.getByTestId('tick-action-wrapper');
    expect(wrapper.dataset.menuLabel).toBe('Tick');
  });

  it('shows count in menu item label when logbook has entries', () => {
    mockUseBoardProvider.mockReturnValue({
      saveTick: mockSaveTick,
      isAuthenticated: true,
      logbook: [logbookEntry()],
      getLogbook: vi.fn(),
      saveClimb: vi.fn(),
      isLoading: false,
      error: null,
      isInitialized: true,
      boardName: 'kilter',
    });

    render(
      <TickActionWrapper
        climb={mockClimb}
        boardDetails={mockBoardDetails}
        angle={40}
        viewMode="dropdown"
      />,
    );

    const wrapper = screen.getByTestId('tick-action-wrapper');
    expect(wrapper.dataset.menuLabel).toBe('Tick (1)');
  });

  it('renders list mode with full-width button', () => {
    render(
      <TickActionWrapper
        climb={mockClimb}
        boardDetails={mockBoardDetails}
        angle={40}
        viewMode="list"
      />,
    );

    expect(screen.getByText('Tick')).toBeDefined();
  });
});
