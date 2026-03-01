import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

const mockPush = vi.fn();
const mockReplace = vi.fn();
let mockPathname = '/kilter/1/10/1,2/40/list';
let mockActiveSession: Record<string, unknown> | null = {
  sessionId: 'session-123',
  boardPath: '/kilter/1/10/1,2/40/list',
  sessionName: 'Test Session',
};
let mockSession: Record<string, unknown> | null = {
  name: 'Morning Sesh',
  goal: 'Send V5',
  startedAt: new Date(Date.now() - 30 * 60000).toISOString(),
};
let mockUsers = [{ id: 'user-1', name: 'Alice' }, { id: 'user-2', name: 'Bob' }];
const mockEndSessionWithSummary = vi.fn();
let mockAngle: number | undefined = 40;
let mockBoardDetails: Record<string, unknown> | null = { board_name: 'kilter' };

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  usePathname: () => mockPathname,
}));

vi.mock('@/app/components/persistent-session/persistent-session-context', () => ({
  usePersistentSession: () => ({
    activeSession: mockActiveSession,
    session: mockSession,
    users: mockUsers,
    endSessionWithSummary: mockEndSessionWithSummary,
  }),
}));

vi.mock('@/app/components/queue-control/queue-bridge-context', () => ({
  useQueueBridgeBoardInfo: () => ({
    boardDetails: mockBoardDetails,
    angle: mockAngle,
  }),
}));

vi.mock('@/app/components/swipeable-drawer/swipeable-drawer', () => ({
  default: ({ open, children, title }: { open: boolean; children: React.ReactNode; title: string }) =>
    open ? <div data-testid="swipeable-drawer" data-title={title}>{children}</div> : null,
}));

vi.mock('@/app/components/board-page/angle-selector', () => ({
  default: ({ onAngleChange, currentAngle }: { onAngleChange: (angle: number) => void; currentAngle: number }) => (
    <div data-testid="angle-selector">
      <span>Current: {currentAngle}</span>
      <button data-testid="change-angle-45" onClick={() => onAngleChange(45)}>Set 45</button>
      <button data-testid="change-angle-20" onClick={() => onAngleChange(20)}>Set 20</button>
    </div>
  ),
}));

import SeshSettingsDrawer from '../sesh-settings-drawer';

describe('SeshSettingsDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = '/kilter/1/10/1,2/40/list';
    mockActiveSession = {
      sessionId: 'session-123',
      boardPath: '/kilter/1/10/1,2/40/list',
      sessionName: 'Test Session',
    };
    mockSession = {
      name: 'Morning Sesh',
      goal: 'Send V5',
      startedAt: new Date(Date.now() - 30 * 60000).toISOString(),
    };
    mockUsers = [{ id: 'user-1', name: 'Alice' }, { id: 'user-2', name: 'Bob' }];
    mockAngle = 40;
    mockBoardDetails = { board_name: 'kilter' };
  });

  it('renders nothing when activeSession is null', () => {
    mockActiveSession = null;
    const { container } = render(
      <SeshSettingsDrawer open={true} onClose={vi.fn()} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('displays session name', () => {
    render(<SeshSettingsDrawer open={true} onClose={vi.fn()} />);
    expect(screen.getByText('Morning Sesh')).toBeTruthy();
  });

  it('displays participant count', () => {
    render(<SeshSettingsDrawer open={true} onClose={vi.fn()} />);
    expect(screen.getByText('2 participants')).toBeTruthy();
  });

  it('displays singular participant label for one user', () => {
    mockUsers = [{ id: 'user-1', name: 'Alice' }];
    render(<SeshSettingsDrawer open={true} onClose={vi.fn()} />);
    expect(screen.getByText('1 participant')).toBeTruthy();
  });

  it('displays session goal', () => {
    render(<SeshSettingsDrawer open={true} onClose={vi.fn()} />);
    expect(screen.getByText('Goal: Send V5')).toBeTruthy();
  });

  it('shows angle selector when boardDetails and angle exist', () => {
    render(<SeshSettingsDrawer open={true} onClose={vi.fn()} />);
    expect(screen.getByTestId('angle-selector')).toBeTruthy();
  });

  it('hides angle selector when boardDetails is null', () => {
    mockBoardDetails = null;
    render(<SeshSettingsDrawer open={true} onClose={vi.fn()} />);
    expect(screen.queryByTestId('angle-selector')).toBeNull();
  });

  describe('handleAngleChange', () => {
    it('replaces angle in long-form route preserving trailing segments', () => {
      mockPathname = '/kilter/1/10/1,2/40/list';
      mockAngle = 40;
      render(<SeshSettingsDrawer open={true} onClose={vi.fn()} />);

      fireEvent.click(screen.getByTestId('change-angle-45'));
      expect(mockPush).toHaveBeenCalledWith('/kilter/1/10/1,2/45/list');
    });

    it('replaces angle in slug-based route preserving trailing segments', () => {
      mockPathname = '/b/my-board/40/play/some-uuid';
      mockAngle = 40;
      render(<SeshSettingsDrawer open={true} onClose={vi.fn()} />);

      fireEvent.click(screen.getByTestId('change-angle-45'));
      expect(mockPush).toHaveBeenCalledWith('/b/my-board/45/play/some-uuid');
    });

    it('replaces angle in slug-based route with /list suffix', () => {
      mockPathname = '/b/my-board/40/list';
      mockAngle = 40;
      render(<SeshSettingsDrawer open={true} onClose={vi.fn()} />);

      fireEvent.click(screen.getByTestId('change-angle-20'));
      expect(mockPush).toHaveBeenCalledWith('/b/my-board/20/list');
    });

    it('does not navigate when angle is undefined', () => {
      mockAngle = undefined;
      render(<SeshSettingsDrawer open={true} onClose={vi.fn()} />);
      // Angle selector is hidden when angle is undefined, so no button to click
      expect(screen.queryByTestId('angle-selector')).toBeNull();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('handleStopSession', () => {
    it('calls endSessionWithSummary and onClose', () => {
      const onClose = vi.fn();
      render(<SeshSettingsDrawer open={true} onClose={onClose} />);

      fireEvent.click(screen.getByText('Stop Session'));
      expect(mockEndSessionWithSummary).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });
});
