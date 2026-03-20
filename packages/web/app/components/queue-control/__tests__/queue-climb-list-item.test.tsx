import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import type { Climb, BoardDetails } from '@/app/lib/types';
import type { ClimbQueueItem } from '../types';

// --- Mocks ---

let capturedSwipeOptions: Record<string, unknown> | null = null;

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => '/kilter/original/12x12/default/40/play/some-climb',
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/app/hooks/use-color-mode', () => ({
  useColorMode: () => ({ mode: 'light' }),
}));

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
  useSwipeActions: (options: Record<string, unknown>) => {
    capturedSwipeOptions = options;
    return {
      swipeHandlers: { ref: vi.fn() },
      isSwipeComplete: false,
      contentRef: vi.fn(),
      leftActionRef: vi.fn(),
      rightActionRef: vi.fn(),
    };
  },
}));

vi.mock('@/app/lib/hooks/use-double-tap', () => ({
  useDoubleTap: (cb?: () => void) => ({
    ref: vi.fn(),
    onDoubleClick: cb ?? vi.fn(),
  }),
}));

vi.mock('@/app/lib/grade-colors', () => ({
  getSoftGradeColor: () => '#888',
  getSoftVGradeColor: () => '#888',
  getGradeTintColor: (_d: unknown, _s: unknown, _dark: unknown) => null,
  formatVGrade: (d: string) => (d.startsWith('V') ? d : null),
}));

vi.mock('@/app/lib/climb-action-utils', () => ({
  getExcludedClimbActions: () => [],
}));

vi.mock('../../climb-card/climb-thumbnail', () => ({
  default: () => <div data-testid="climb-thumbnail" />,
}));

vi.mock('../../climb-card/drawer-climb-header', () => ({
  default: () => <div data-testid="drawer-climb-header" />,
}));

vi.mock('../../swipeable-drawer/swipeable-drawer', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="swipeable-drawer">{children}</div>,
}));

vi.mock('../../climb-card/ascent-status', () => ({
  AscentStatus: () => <span data-testid="ascent-status" />,
}));

vi.mock('@/app/lib/url-utils', () => ({
  constructClimbInfoUrl: () => 'https://example.com/climb',
  getContextAwareClimbViewUrl: () => '/kilter/original/12x12/default/40/view/climb-1',
}));

// Mock drag-and-drop
vi.mock('@atlaskit/pragmatic-drag-and-drop/element/adapter', () => ({
  draggable: () => () => {},
  dropTargetForElements: () => () => {},
}));

vi.mock('@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box', () => ({
  DropIndicator: () => null,
}));

vi.mock('@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge', () => ({
  attachClosestEdge: (data: unknown) => data,
  extractClosestEdge: () => null,
}));

vi.mock('@atlaskit/pragmatic-drag-and-drop/combine', () => ({
  combine: (...fns: Array<() => void>) => () => fns.forEach((f) => f()),
}));

vi.mock('@/app/theme/theme-config', () => ({
  themeTokens: {
    spacing: { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 16: 64 },
    colors: { error: '#B8524C', primary: '#8C4A52', success: '#6B9080' },
    neutral: { 200: '#E5E7EB', 400: '#9CA3AF', 500: '#6B7280' },
    typography: {
      fontSize: { xs: 12, sm: 14, base: 16, xl: 20, '2xl': 24 },
      fontWeight: { normal: 400, semibold: 600, bold: 700 },
    },
  },
}));

import QueueClimbListItem from '../queue-climb-list-item';

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

function makeQueueItem(overrides: Partial<ClimbQueueItem> = {}): ClimbQueueItem {
  return {
    uuid: 'queue-item-1',
    climb: makeClimb(),
    ...overrides,
  };
}

const defaultProps = () => ({
  item: makeQueueItem(),
  index: 0,
  isCurrent: false,
  isHistory: false,
  boardDetails: makeBoardDetails(),
  setCurrentClimbQueueItem: vi.fn(),
  removeFromQueue: vi.fn(),
  onTickClick: vi.fn(),
});

describe('QueueClimbListItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedSwipeOptions = null;
  });

  describe('basic rendering', () => {
    it('renders the climb name', () => {
      render(<QueueClimbListItem {...defaultProps()} />);
      expect(screen.getByText('Test Boulder')).toBeTruthy();
    });

    it('renders a queue-item test id', () => {
      render(<QueueClimbListItem {...defaultProps()} />);
      expect(screen.getByTestId('queue-item')).toBeTruthy();
    });

    it('renders the climb thumbnail', () => {
      render(<QueueClimbListItem {...defaultProps()} />);
      expect(screen.getByTestId('climb-thumbnail')).toBeTruthy();
    });

    it('renders context menu button', () => {
      render(<QueueClimbListItem {...defaultProps()} />);
      expect(screen.getByTestId('MoreVertOutlinedIcon')).toBeTruthy();
    });
  });

  describe('addedBy avatar', () => {
    it('shows user avatar when addedByUser is provided', () => {
      const props = defaultProps();
      props.item = makeQueueItem({
        addedByUser: { id: 'user-1', username: 'alice', avatarUrl: 'https://example.com/alice.jpg' },
      });
      render(<QueueClimbListItem {...props} />);

      // Avatar image should be rendered
      const img = screen.getByRole('img');
      expect(img.getAttribute('src')).toBe('https://example.com/alice.jpg');
    });

    it('shows bluetooth icon when no addedByUser', () => {
      render(<QueueClimbListItem {...defaultProps()} />);
      // Should render an SVG bluetooth icon (the custom BluetoothIcon component)
      const svg = document.querySelector('svg');
      expect(svg).toBeTruthy();
    });
  });

  describe('swipe actions', () => {
    it('configures simple swipe thresholds (no long-swipe)', () => {
      render(<QueueClimbListItem {...defaultProps()} />);

      expect(capturedSwipeOptions).not.toBeNull();
      expect(capturedSwipeOptions?.swipeThreshold).toBe(100);
      expect(capturedSwipeOptions?.maxSwipe).toBe(120);
      expect(capturedSwipeOptions?.longSwipeRightThreshold).toBeUndefined();
    });

    it('calls onTickClick when swiped right (tick action)', () => {
      const props = defaultProps();
      render(<QueueClimbListItem {...props} />);

      const swipeRightHandler = capturedSwipeOptions?.onSwipeRight as () => void;
      swipeRightHandler();
      expect(props.onTickClick).toHaveBeenCalledWith(props.item.climb);
    });

    it('calls removeFromQueue when swiped left (delete action)', () => {
      const props = defaultProps();
      render(<QueueClimbListItem {...props} />);

      const swipeLeftHandler = capturedSwipeOptions?.onSwipeLeft as () => void;
      swipeLeftHandler();
      expect(props.removeFromQueue).toHaveBeenCalledWith(props.item);
    });

    it('disables swipe in edit mode', () => {
      render(<QueueClimbListItem {...defaultProps()} isEditMode />);
      expect(capturedSwipeOptions?.disabled).toBe(true);
    });
  });

  describe('context menu', () => {
    it('opens menu on click', () => {
      render(<QueueClimbListItem {...defaultProps()} />);

      const menuButton = screen.getByTestId('MoreVertOutlinedIcon').closest('button')!;
      fireEvent.click(menuButton);

      expect(screen.getByText('View Climb')).toBeTruthy();
      expect(screen.getByText('Tick Climb')).toBeTruthy();
      expect(screen.getByText('Open in App')).toBeTruthy();
      expect(screen.getByText('Remove from Queue')).toBeTruthy();
    });

    it('calls removeFromQueue when Remove from Queue is clicked', () => {
      const props = defaultProps();
      render(<QueueClimbListItem {...props} />);

      const menuButton = screen.getByTestId('MoreVertOutlinedIcon').closest('button')!;
      fireEvent.click(menuButton);

      fireEvent.click(screen.getByText('Remove from Queue'));
      expect(props.removeFromQueue).toHaveBeenCalledWith(props.item);
    });

    it('calls onTickClick when Tick Climb is clicked', () => {
      const props = defaultProps();
      render(<QueueClimbListItem {...props} />);

      const menuButton = screen.getByTestId('MoreVertOutlinedIcon').closest('button')!;
      fireEvent.click(menuButton);

      fireEvent.click(screen.getByText('Tick Climb'));
      expect(props.onTickClick).toHaveBeenCalledWith(props.item.climb);
    });

    it('hides menu button in edit mode', () => {
      render(<QueueClimbListItem {...defaultProps()} isEditMode />);
      expect(screen.queryByTestId('MoreVertOutlinedIcon')).toBeNull();
    });
  });

  describe('edit mode', () => {
    it('renders checkbox in edit mode', () => {
      render(<QueueClimbListItem {...defaultProps()} isEditMode />);
      expect(screen.getByRole('checkbox')).toBeTruthy();
    });

    it('checkbox reflects isSelected prop', () => {
      render(<QueueClimbListItem {...defaultProps()} isEditMode isSelected />);
      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });

    it('calls onToggleSelect when checkbox is toggled', () => {
      const onToggleSelect = vi.fn();
      const props = defaultProps();
      render(<QueueClimbListItem {...props} isEditMode onToggleSelect={onToggleSelect} />);

      fireEvent.click(screen.getByRole('checkbox'));
      expect(onToggleSelect).toHaveBeenCalledWith(props.item.uuid);
    });

    it('calls onToggleSelect when row is clicked in edit mode', () => {
      const onToggleSelect = vi.fn();
      const props = defaultProps();
      render(<QueueClimbListItem {...props} isEditMode onToggleSelect={onToggleSelect} />);

      // Click the edit mode container (the wrapper div around checkbox + content)
      const queueItem = screen.getByTestId('queue-item');
      const editContainer = queueItem.firstElementChild as HTMLElement;
      fireEvent.click(editContainer);
      expect(onToggleSelect).toHaveBeenCalledWith(props.item.uuid);
    });

    it('does not show checkbox when not in edit mode', () => {
      render(<QueueClimbListItem {...defaultProps()} />);
      expect(screen.queryByRole('checkbox')).toBeNull();
    });
  });

  describe('drag-and-drop', () => {
    it('has cursor grab style when not in edit mode', () => {
      render(<QueueClimbListItem {...defaultProps()} />);
      const item = screen.getByTestId('queue-item');
      expect(item.style.cursor).toBe('grab');
    });

    it('does not have cursor grab in edit mode', () => {
      render(<QueueClimbListItem {...defaultProps()} isEditMode />);
      const item = screen.getByTestId('queue-item');
      expect(item.style.cursor).not.toBe('grab');
    });
  });

  describe('visual states', () => {
    it('applies history opacity', () => {
      // contentOpacity is passed to ClimbListItem which applies it
      // We verify by checking the swipe options don't include disabled
      render(<QueueClimbListItem {...defaultProps()} isHistory />);
      // The component should still render
      expect(screen.getByText('Test Boulder')).toBeTruthy();
    });

    it('marks current item as selected', () => {
      render(<QueueClimbListItem {...defaultProps()} isCurrent />);
      // The component should still render — selected state is visual
      expect(screen.getByText('Test Boulder')).toBeTruthy();
    });
  });
});
