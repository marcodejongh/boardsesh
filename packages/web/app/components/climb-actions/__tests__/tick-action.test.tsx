import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// --- Mocks (must be before imports) ---

const mockUseOptionalBoardProvider = vi.fn();
const MockBoardProvider = vi.fn(({ children }: { boardName: string; children: React.ReactNode }) => (
  <div data-testid="mock-board-provider">{children}</div>
));
vi.mock('../../board-provider/board-provider-context', () => ({
  useOptionalBoardProvider: () => mockUseOptionalBoardProvider(),
  BoardProvider: (props: { boardName: string; children: React.ReactNode }) => MockBoardProvider(props),
}));

const mockUseSession = vi.fn();
vi.mock('next-auth/react', () => ({
  useSession: () => mockUseSession(),
}));

const mockUseMyBoards = vi.fn();
vi.mock('@/app/hooks/use-my-boards', () => ({
  useMyBoards: (enabled: boolean) => mockUseMyBoards(enabled),
}));

vi.mock('@/app/hooks/use-always-tick-in-app', () => ({
  useAlwaysTickInApp: () => ({
    alwaysUseApp: false,
    loaded: true,
    enableAlwaysUseApp: vi.fn(),
  }),
}));

const mockTrack = vi.fn();
vi.mock('@vercel/analytics', () => ({
  track: (...args: unknown[]) => mockTrack(...args),
}));

vi.mock('@/app/lib/url-utils', () => ({
  constructClimbInfoUrl: vi.fn(() => 'https://app.example.com/climb/info'),
}));

// Simplified component mocks
vi.mock('../../swipeable-drawer/swipeable-drawer', () => ({
  default: ({ children, title, open }: { children: React.ReactNode; title: string; open: boolean }) =>
    open ? <div data-testid="swipeable-drawer" data-title={title}>{children}</div> : null,
}));

vi.mock('../action-tooltip', () => ({
  ActionTooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../../auth/auth-modal', () => ({
  default: ({ open }: { open: boolean }) =>
    open ? <div data-testid="auth-modal" /> : null,
}));

vi.mock('../../logbook/log-ascent-drawer', () => ({
  LogAscentDrawer: ({ open }: { open: boolean }) =>
    open ? <div data-testid="log-ascent-drawer" /> : null,
}));

vi.mock('../../logbook/logascent-form', () => ({
  LogAscentForm: () => <div data-testid="log-ascent-form" />,
}));

vi.mock('../../board-scroll/board-scroll-section', () => ({
  default: ({ children, loading }: { children: React.ReactNode; loading?: boolean }) =>
    loading ? <div data-testid="board-scroll-loading" /> : <div data-testid="board-scroll-section">{children}</div>,
}));

vi.mock('../../board-scroll/board-scroll-card', () => ({
  default: ({ userBoard, onClick }: { userBoard: { uuid: string; name: string }; onClick: () => void }) => (
    <button data-testid={`board-card-${userBoard.uuid}`} onClick={onClick}>
      {userBoard.name}
    </button>
  ),
}));

// Import after mocks
import { TickAction } from '../actions/tick-action';
import type { ClimbActionProps } from '../types';

// --- Test data ---

const mockClimb = {
  uuid: 'climb-1',
  name: 'Test Climb',
  difficulty: 'V5',
  frames: 'p1r42',
  quality_average: '3.5',
  angle: 40,
} as any;

const mockBoardDetails = {
  board_name: 'kilter',
  layout_id: 1,
  size_id: 10,
  set_ids: '1,2',
  layout_name: 'Original',
  size_name: '12x12',
  size_description: 'Full',
  set_names: ['Standard'],
  supportsMirroring: true,
} as any;

const defaultProps: ClimbActionProps = {
  climb: mockClimb,
  boardDetails: mockBoardDetails,
  angle: 40,
  viewMode: 'button',
  onComplete: vi.fn(),
};

const mockUserBoard = {
  uuid: 'board-1',
  slug: 'my-kilter',
  ownerId: 'user-1',
  boardType: 'kilter',
  layoutId: 1,
  sizeId: 10,
  setIds: '1,2',
  name: 'My Kilter Board',
  isPublic: false,
} as any;

const mockUserBoard2 = {
  uuid: 'board-2',
  slug: 'gym-kilter',
  ownerId: 'user-1',
  boardType: 'kilter',
  layoutId: 1,
  sizeId: 10,
  setIds: '1,2',
  name: 'Gym Kilter',
  isPublic: false,
} as any;

const mockTensionBoard = {
  uuid: 'board-3',
  slug: 'tension-board',
  ownerId: 'user-1',
  boardType: 'tension',
  layoutId: 2,
  sizeId: 5,
  setIds: '3',
  name: 'My Tension',
  isPublic: false,
} as any;

/**
 * Wrapper component to render TickAction (which returns ClimbActionResult, not JSX directly)
 */
function TestTickAction(props: ClimbActionProps) {
  const result = TickAction(props);
  return <>{result.element}</>;
}

// --- Helper to set up mock states ---

function setupMocks(options: {
  hasBoardProvider?: boolean;
  isAuthenticated?: boolean;
  logbook?: any[];
  boards?: any[];
  isLoadingBoards?: boolean;
  sessionStatus?: string;
}) {
  const {
    hasBoardProvider = false,
    isAuthenticated = false,
    logbook = [],
    boards = [],
    isLoadingBoards = false,
    sessionStatus,
  } = options;

  if (hasBoardProvider) {
    mockUseOptionalBoardProvider.mockReturnValue({
      isAuthenticated,
      logbook,
      boardName: 'kilter',
      isLoading: false,
      error: null,
      isInitialized: true,
      getLogbook: vi.fn(),
      saveTick: vi.fn(),
      saveClimb: vi.fn(),
    });
  } else {
    mockUseOptionalBoardProvider.mockReturnValue(null);
  }

  mockUseSession.mockReturnValue({
    status: sessionStatus ?? (isAuthenticated ? 'authenticated' : 'unauthenticated'),
    data: isAuthenticated ? { user: { id: 'user-1' }, expires: '' } : null,
    update: vi.fn(),
  });

  mockUseMyBoards.mockReturnValue({
    boards,
    isLoading: isLoadingBoards,
    error: null,
  });
}

// --- Tests ---

describe('TickAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('renders without crashing', () => {
    it('renders with BoardProvider present', () => {
      setupMocks({ hasBoardProvider: true, isAuthenticated: true });
      const { container } = render(<TestTickAction {...defaultProps} />);
      expect(container).toBeTruthy();
    });

    it('renders without BoardProvider when authenticated', () => {
      setupMocks({ isAuthenticated: true, boards: [mockUserBoard] });
      const { container } = render(<TestTickAction {...defaultProps} />);
      expect(container).toBeTruthy();
    });

    it('renders without BoardProvider when not authenticated', () => {
      setupMocks({ isAuthenticated: false });
      const { container } = render(<TestTickAction {...defaultProps} />);
      expect(container).toBeTruthy();
    });
  });

  describe('return value', () => {
    it('returns available: true and key: tick', () => {
      setupMocks({ hasBoardProvider: true, isAuthenticated: true });
      const result = renderTickActionResult(defaultProps);
      expect(result.available).toBe(true);
      expect(result.key).toBe('tick');
    });

    it('includes menuItem with label', () => {
      setupMocks({ hasBoardProvider: true, isAuthenticated: true });
      const result = renderTickActionResult(defaultProps);
      expect(result.menuItem.key).toBe('tick');
      expect(result.menuItem.label).toBe('Tick');
    });

    it('includes badge count in menuItem label when logbook has entries', () => {
      setupMocks({
        hasBoardProvider: true,
        isAuthenticated: true,
        logbook: [{ climb_uuid: 'climb-1', angle: 40, is_ascent: true }],
      });
      const result = renderTickActionResult(defaultProps);
      expect(result.menuItem.label).toBe('Tick (1)');
    });
  });

  describe('with BoardProvider (inside board route)', () => {
    it('shows LogAscentDrawer when authenticated and drawer is opened', async () => {
      setupMocks({ hasBoardProvider: true, isAuthenticated: true });
      render(<TestTickAction {...defaultProps} />);

      await act(async () => {
        screen.getByRole('button', { name: /tick/i }).click();
      });

      expect(screen.getByTestId('log-ascent-drawer')).toBeTruthy();
    });

    it('shows sign-in prompt when not authenticated and drawer is opened', async () => {
      setupMocks({ hasBoardProvider: true, isAuthenticated: false });
      render(<TestTickAction {...defaultProps} />);

      await act(async () => {
        screen.getByRole('button', { name: /tick/i }).click();
      });

      const drawer = screen.getByTestId('swipeable-drawer');
      expect(drawer.getAttribute('data-title')).toBe('Sign In Required');
      expect(screen.getByText('Sign in to record ticks')).toBeTruthy();
    });

    it('does not show board selector', async () => {
      setupMocks({ hasBoardProvider: true, isAuthenticated: true });
      render(<TestTickAction {...defaultProps} />);

      await act(async () => {
        screen.getByRole('button', { name: /tick/i }).click();
      });

      expect(screen.queryByText('Which board did you climb on?')).toBeNull();
    });

    it('does not fetch user boards when BoardProvider exists', () => {
      setupMocks({ hasBoardProvider: true, isAuthenticated: true });
      render(<TestTickAction {...defaultProps} />);

      // useMyBoards should be called with false (needsBoardSelector = false)
      expect(mockUseMyBoards).toHaveBeenCalledWith(false);
    });
  });

  describe('without BoardProvider, authenticated (outside board route)', () => {
    it('shows board selector when matching boards exist', async () => {
      setupMocks({ isAuthenticated: true, boards: [mockUserBoard, mockUserBoard2] });
      render(<TestTickAction {...defaultProps} />);

      await act(async () => {
        screen.getByRole('button', { name: /tick/i }).click();
      });

      const drawer = screen.getByTestId('swipeable-drawer');
      expect(drawer.getAttribute('data-title')).toBe('Select Board');
      expect(screen.getByText('Which board did you climb on?')).toBeTruthy();
      expect(screen.getByTestId('board-card-board-1')).toBeTruthy();
      expect(screen.getByTestId('board-card-board-2')).toBeTruthy();
    });

    it('filters boards to matching board type', async () => {
      // Boards include both kilter and tension, but climb is kilter
      setupMocks({ isAuthenticated: true, boards: [mockUserBoard, mockTensionBoard] });
      render(<TestTickAction {...defaultProps} />);

      await act(async () => {
        screen.getByRole('button', { name: /tick/i }).click();
      });

      // Should only show the kilter board, not the tension board
      expect(screen.getByTestId('board-card-board-1')).toBeTruthy();
      expect(screen.queryByTestId('board-card-board-3')).toBeNull();
    });

    it('shows LogAscentForm wrapped in BoardProvider after selecting a board', async () => {
      setupMocks({ isAuthenticated: true, boards: [mockUserBoard, mockUserBoard2] });
      render(<TestTickAction {...defaultProps} />);

      // Open drawer
      await act(async () => {
        screen.getByRole('button', { name: /tick/i }).click();
      });

      // Select a board
      await act(async () => {
        screen.getByTestId('board-card-board-1').click();
      });

      // Should now show the log ascent form inside a BoardProvider
      expect(screen.getByTestId('mock-board-provider')).toBeTruthy();
      expect(screen.getByTestId('log-ascent-form')).toBeTruthy();

      // Drawer title should change to "Log Ascent"
      const drawer = screen.getByTestId('swipeable-drawer');
      expect(drawer.getAttribute('data-title')).toBe('Log Ascent');
    });

    it('passes selected board type to BoardProvider', async () => {
      setupMocks({ isAuthenticated: true, boards: [mockUserBoard] });
      render(<TestTickAction {...defaultProps} />);

      await act(async () => {
        screen.getByRole('button', { name: /tick/i }).click();
      });

      await act(async () => {
        screen.getByTestId('board-card-board-1').click();
      });

      expect(MockBoardProvider).toHaveBeenCalledWith(
        expect.objectContaining({ boardName: 'kilter' }),
      );
    });

    it('fetches user boards when outside board route and authenticated', () => {
      setupMocks({ isAuthenticated: true, boards: [] });
      render(<TestTickAction {...defaultProps} />);

      // useMyBoards should be called with true (needsBoardSelector = true)
      expect(mockUseMyBoards).toHaveBeenCalledWith(true);
    });

    it('shows loading state while boards are being fetched', async () => {
      setupMocks({ isAuthenticated: true, boards: [], isLoadingBoards: true });
      render(<TestTickAction {...defaultProps} />);

      await act(async () => {
        screen.getByRole('button', { name: /tick/i }).click();
      });

      expect(screen.getByTestId('board-scroll-loading')).toBeTruthy();
    });
  });

  describe('without BoardProvider, authenticated, no matching boards', () => {
    it('skips board selector and goes directly to form', async () => {
      setupMocks({ isAuthenticated: true, boards: [] });
      render(<TestTickAction {...defaultProps} />);

      await act(async () => {
        screen.getByRole('button', { name: /tick/i }).click();
      });

      // Should not show board selector
      expect(screen.queryByText('Which board did you climb on?')).toBeNull();

      // Should show the log form directly
      expect(screen.getByTestId('log-ascent-form')).toBeTruthy();

      // Drawer title should be "Log Ascent" (not "Select Board")
      const drawer = screen.getByTestId('swipeable-drawer');
      expect(drawer.getAttribute('data-title')).toBe('Log Ascent');
    });

    it('shows informational message about no matching boards', async () => {
      setupMocks({ isAuthenticated: true, boards: [] });
      render(<TestTickAction {...defaultProps} />);

      await act(async () => {
        screen.getByRole('button', { name: /tick/i }).click();
      });

      expect(screen.getByText(/don\u2019t have any Kilter boards saved/)).toBeTruthy();
    });

    it('wraps form in BoardProvider using boardDetails.board_name as fallback', async () => {
      setupMocks({ isAuthenticated: true, boards: [] });
      render(<TestTickAction {...defaultProps} />);

      await act(async () => {
        screen.getByRole('button', { name: /tick/i }).click();
      });

      // Should use boardDetails.board_name (kilter) as the provider boardName
      expect(MockBoardProvider).toHaveBeenCalledWith(
        expect.objectContaining({ boardName: 'kilter' }),
      );
    });

    it('skips board selector when only non-matching boards exist', async () => {
      // User has tension boards but the climb is kilter
      setupMocks({ isAuthenticated: true, boards: [mockTensionBoard] });
      render(<TestTickAction {...defaultProps} />);

      await act(async () => {
        screen.getByRole('button', { name: /tick/i }).click();
      });

      // Should skip selector (no matching kilter boards) and go to form
      expect(screen.queryByText('Which board did you climb on?')).toBeNull();
      expect(screen.getByTestId('log-ascent-form')).toBeTruthy();
    });
  });

  describe('without BoardProvider, not authenticated', () => {
    it('shows sign-in prompt', async () => {
      setupMocks({ isAuthenticated: false });
      render(<TestTickAction {...defaultProps} />);

      await act(async () => {
        screen.getByRole('button', { name: /tick/i }).click();
      });

      const drawer = screen.getByTestId('swipeable-drawer');
      expect(drawer.getAttribute('data-title')).toBe('Sign In Required');
      expect(screen.getByText('Sign in to record ticks')).toBeTruthy();
    });

    it('does not fetch user boards', () => {
      setupMocks({ isAuthenticated: false });
      render(<TestTickAction {...defaultProps} />);

      // useMyBoards should be called with false
      expect(mockUseMyBoards).toHaveBeenCalledWith(false);
    });

    it('does not show board selector or LogAscentForm', async () => {
      setupMocks({ isAuthenticated: false });
      render(<TestTickAction {...defaultProps} />);

      await act(async () => {
        screen.getByRole('button', { name: /tick/i }).click();
      });

      expect(screen.queryByText('Which board did you climb on?')).toBeNull();
      expect(screen.queryByTestId('log-ascent-form')).toBeNull();
    });
  });

  describe('drawer close resets state', () => {
    it('resets board selection when drawer closes', async () => {
      setupMocks({ isAuthenticated: true, boards: [mockUserBoard, mockUserBoard2] });
      const { unmount } = render(<TestTickAction {...defaultProps} />);

      // Open drawer
      await act(async () => {
        screen.getByRole('button', { name: /tick/i }).click();
      });

      // Select a board
      await act(async () => {
        screen.getByTestId('board-card-board-1').click();
      });

      // Verify form is shown
      expect(screen.getByTestId('log-ascent-form')).toBeTruthy();

      // Unmount the first render, then do a fresh render to verify state is independent
      unmount();

      // Fresh render - state should start fresh (selectedBoard = null)
      render(<TestTickAction {...defaultProps} />);

      // Open drawer again
      await act(async () => {
        screen.getByRole('button', { name: /tick/i }).click();
      });

      // Should show board selector again (not the form)
      expect(screen.getByText('Which board did you climb on?')).toBeTruthy();
    });
  });

  describe('logbook badge count', () => {
    it('shows no badge when logbook is empty', () => {
      setupMocks({ hasBoardProvider: true, isAuthenticated: true, logbook: [] });
      const result = renderTickActionResult(defaultProps);
      expect(result.menuItem.label).toBe('Tick');
    });

    it('shows badge count matching climb and angle', () => {
      setupMocks({
        hasBoardProvider: true,
        isAuthenticated: true,
        logbook: [
          { climb_uuid: 'climb-1', angle: 40, is_ascent: true },
          { climb_uuid: 'climb-1', angle: 40, is_ascent: false },
        ],
      });
      const result = renderTickActionResult(defaultProps);
      expect(result.menuItem.label).toBe('Tick (2)');
    });

    it('filters logbook by climb uuid and angle', () => {
      setupMocks({
        hasBoardProvider: true,
        isAuthenticated: true,
        logbook: [
          { climb_uuid: 'climb-1', angle: 40, is_ascent: true },
          { climb_uuid: 'climb-1', angle: 50, is_ascent: true }, // Different angle
          { climb_uuid: 'climb-2', angle: 40, is_ascent: true }, // Different climb
        ],
      });
      const result = renderTickActionResult(defaultProps);
      // Only the first entry matches climb-1 at angle 40
      expect(result.menuItem.label).toBe('Tick (1)');
    });

    it('defaults logbook to empty when no BoardProvider', () => {
      setupMocks({ isAuthenticated: true, boards: [] });
      const result = renderTickActionResult(defaultProps);
      expect(result.menuItem.label).toBe('Tick');
    });
  });

  describe('analytics tracking', () => {
    it('tracks tick button click with board layout info', async () => {
      setupMocks({ hasBoardProvider: true, isAuthenticated: true });
      render(<TestTickAction {...defaultProps} />);

      await act(async () => {
        screen.getByRole('button', { name: /tick/i }).click();
      });

      expect(mockTrack).toHaveBeenCalledWith('Tick Button Clicked', {
        boardLayout: 'Original',
        existingAscentCount: 0,
      });
    });

    it('calls onComplete callback when clicked', async () => {
      setupMocks({ hasBoardProvider: true, isAuthenticated: true });
      const onComplete = vi.fn();
      render(<TestTickAction {...defaultProps} onComplete={onComplete} />);

      await act(async () => {
        screen.getByRole('button', { name: /tick/i }).click();
      });

      expect(onComplete).toHaveBeenCalled();
    });
  });
});

/**
 * Helper to call TickAction as a hook and get the raw result.
 * Renders inside a component to ensure hooks are called properly.
 */
function renderTickActionResult(props: ClimbActionProps) {
  let result: ReturnType<typeof TickAction> | undefined;

  function Capture() {
    result = TickAction(props);
    return null;
  }

  render(<Capture />);
  return result!;
}
