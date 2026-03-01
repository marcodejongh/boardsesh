import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

let mockActiveSession: Record<string, unknown> | null = null;
let mockIsOnBoardRoute = false;

vi.mock('@/app/components/persistent-session/persistent-session-context', () => ({
  usePersistentSession: () => ({
    activeSession: mockActiveSession,
  }),
  useIsOnBoardRoute: () => mockIsOnBoardRoute,
}));

vi.mock('@/app/components/search-drawer/unified-search-drawer', () => ({
  default: ({ open, defaultCategory }: { open: boolean; onClose: () => void; defaultCategory: string }) =>
    open ? <div data-testid="unified-search-drawer" data-category={defaultCategory} /> : null,
}));

vi.mock('@/app/components/session-creation/start-sesh-drawer', () => ({
  default: ({ open }: { open: boolean; onClose: () => void }) =>
    open ? <div data-testid="start-sesh-drawer" /> : null,
}));

vi.mock('@/app/components/sesh-settings/sesh-settings-drawer', () => ({
  default: ({ open }: { open: boolean; onClose: () => void }) =>
    open ? <div data-testid="sesh-settings-drawer" /> : null,
}));

vi.mock('@/app/components/user-drawer/user-drawer', () => ({
  default: () => <div data-testid="user-drawer" />,
}));

import GlobalHeader from '../global-header';

const mockBoardConfigs = {} as Parameters<typeof GlobalHeader>[0]['boardConfigs'];

describe('GlobalHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockActiveSession = null;
    mockIsOnBoardRoute = false;
  });

  it('renders user drawer, search pill, and Sesh button', () => {
    render(<GlobalHeader boardConfigs={mockBoardConfigs} />);

    expect(screen.getByTestId('user-drawer')).toBeTruthy();
    expect(screen.getByText('Search')).toBeTruthy();
    expect(screen.getByText('Sesh')).toBeTruthy();
  });

  it('opens UnifiedSearchDrawer when search pill is clicked', () => {
    render(<GlobalHeader boardConfigs={mockBoardConfigs} />);

    expect(screen.queryByTestId('unified-search-drawer')).toBeNull();

    fireEvent.click(screen.getByText('Search'));
    expect(screen.getByTestId('unified-search-drawer')).toBeTruthy();
  });

  it('passes "boards" as defaultCategory when not on board route', () => {
    mockIsOnBoardRoute = false;
    render(<GlobalHeader boardConfigs={mockBoardConfigs} />);

    fireEvent.click(screen.getByText('Search'));
    expect(screen.getByTestId('unified-search-drawer').getAttribute('data-category')).toBe('boards');
  });

  it('passes "climbs" as defaultCategory when on board route', () => {
    mockIsOnBoardRoute = true;
    render(<GlobalHeader boardConfigs={mockBoardConfigs} />);

    fireEvent.click(screen.getByText('Search'));
    expect(screen.getByTestId('unified-search-drawer').getAttribute('data-category')).toBe('climbs');
  });

  it('opens StartSeshDrawer when clicking Sesh with no active session', () => {
    mockActiveSession = null;
    render(<GlobalHeader boardConfigs={mockBoardConfigs} />);

    fireEvent.click(screen.getByText('Sesh'));
    expect(screen.getByTestId('start-sesh-drawer')).toBeTruthy();
    expect(screen.queryByTestId('sesh-settings-drawer')).toBeNull();
  });

  it('opens SeshSettingsDrawer when clicking Sesh with active session', () => {
    mockActiveSession = { sessionId: 'session-123', boardPath: '/b/test/40/list' };
    render(<GlobalHeader boardConfigs={mockBoardConfigs} />);

    fireEvent.click(screen.getByText('Sesh'));
    expect(screen.getByTestId('sesh-settings-drawer')).toBeTruthy();
    expect(screen.queryByTestId('start-sesh-drawer')).toBeNull();
  });
});
