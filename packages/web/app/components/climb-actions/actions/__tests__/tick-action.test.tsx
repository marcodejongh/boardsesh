import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// Mock dependencies before importing the module
vi.mock('@vercel/analytics', () => ({
  track: vi.fn(),
}));

let mockBoardProvider: {
  isAuthenticated: boolean;
  logbook: Array<{ climb_uuid: string; angle: number; is_ascent: boolean }>;
} | null = null;

vi.mock('@/app/components/board-provider/board-provider-context', () => ({
  useOptionalBoardProvider: () => mockBoardProvider,
}));

let mockStandaloneLogbook: Array<{ climb_uuid: string; angle: number; is_ascent: boolean }> = [];
vi.mock('@/app/hooks/use-logbook', () => ({
  useLogbook: () => ({ logbook: mockStandaloneLogbook, isLoading: false, error: null }),
}));

let mockSessionStatus = 'unauthenticated';
vi.mock('next-auth/react', () => ({
  useSession: () => ({ status: mockSessionStatus }),
}));

vi.mock('@/app/hooks/use-always-tick-in-app', () => ({
  useAlwaysTickInApp: () => ({ alwaysUseApp: false, loaded: true, enableAlwaysUseApp: vi.fn() }),
}));

vi.mock('@/app/theme/theme-config', () => ({
  themeTokens: {
    colors: { primary: '#1890ff', success: '#52c41a', error: '#ff4d4f' },
    spacing: { 4: 16 },
    typography: { fontSize: { base: '14px' } },
  },
}));

vi.mock('@mui/icons-material/CheckOutlined', () => ({
  default: () => 'CheckOutlinedIcon',
}));

vi.mock('@mui/icons-material/LoginOutlined', () => ({
  default: () => 'LoginOutlinedIcon',
}));

vi.mock('@mui/icons-material/AppsOutlined', () => ({
  default: () => 'AppsOutlinedIcon',
}));

vi.mock('@mui/material/Button', () => ({
  default: ({ children, onClick }: { children?: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

vi.mock('@mui/material/Badge', () => ({
  default: ({ children }: { children?: React.ReactNode }) => children,
}));

vi.mock('@mui/material/Typography', () => ({
  default: ({ children }: { children?: React.ReactNode }) => children,
}));

vi.mock('@mui/material/Stack', () => ({
  default: ({ children }: { children?: React.ReactNode }) => children,
}));

vi.mock('@mui/material/Box', () => ({
  default: ({ children }: { children?: React.ReactNode }) => children,
}));

vi.mock('../../action-tooltip', () => ({
  ActionTooltip: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('../../../swipeable-drawer/swipeable-drawer', () => ({
  default: ({ children }: { children?: React.ReactNode }) => children,
}));

vi.mock('../../../auth/auth-modal', () => ({
  default: () => null,
}));

vi.mock('../../../logbook/log-ascent-drawer', () => ({
  LogAscentDrawer: () => null,
}));

vi.mock('@/app/lib/url-utils', () => ({
  constructClimbInfoUrl: () => '/test-url',
}));

import { TickAction } from '../tick-action';
import type { ClimbActionProps } from '../../types';
import type { BoardDetails, Climb } from '@/app/lib/types';

function createTestClimb(overrides?: Partial<Climb>): Climb {
  return {
    uuid: 'test-uuid-789',
    name: 'Test Climb',
    setter_username: 'testuser',
    description: 'A test climb',
    frames: 'p1r12p2r13',
    angle: 40,
    ascensionist_count: 5,
    difficulty: '6a/V3',
    quality_average: '3.5',
    stars: 3,
    difficulty_error: '0.50',
    litUpHoldsMap: {},
    benchmark_difficulty: null,
    ...overrides,
  };
}

function createTestBoardDetails(overrides?: Partial<BoardDetails>): BoardDetails {
  return {
    board_name: 'kilter',
    layout_id: 1,
    size_id: 10,
    set_ids: '1,2',
    images_to_holds: {},
    holdsData: {},
    edge_left: 0,
    edge_right: 100,
    edge_bottom: 0,
    edge_top: 100,
    boardHeight: 100,
    boardWidth: 100,
    layout_name: 'Original',
    size_name: '12x12',
    size_description: 'Full Size',
    set_names: ['Standard', 'Extended'],
    ...overrides,
  } as BoardDetails;
}

function createTestProps(overrides?: Partial<ClimbActionProps>): ClimbActionProps {
  return {
    climb: createTestClimb(),
    boardDetails: createTestBoardDetails(),
    angle: 40,
    viewMode: 'icon',
    ...overrides,
  };
}

describe('TickAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBoardProvider = null;
    mockSessionStatus = 'unauthenticated';
    mockStandaloneLogbook = [];
  });

  describe('availability', () => {
    it('always returns available: true', () => {
      const props = createTestProps();
      const { result } = renderHook(() => TickAction(props));
      expect(result.current.available).toBe(true);
    });

    it('returns key: tick', () => {
      const props = createTestProps();
      const { result } = renderHook(() => TickAction(props));
      expect(result.current.key).toBe('tick');
    });
  });

  describe('authentication without BoardProvider', () => {
    it('uses session status when BoardProvider is absent', () => {
      mockBoardProvider = null;
      mockSessionStatus = 'authenticated';
      const props = createTestProps();
      const { result } = renderHook(() => TickAction(props));
      // Authenticated users get "Tick" label (not sign-in prompt)
      expect(result.current.menuItem.label).toBe('Tick');
    });

    it('treats unauthenticated session as not authenticated', () => {
      mockBoardProvider = null;
      mockSessionStatus = 'unauthenticated';
      const props = createTestProps();
      const { result } = renderHook(() => TickAction(props));
      // Should still show Tick label (auth check happens on click)
      expect(result.current.menuItem.label).toBe('Tick');
    });
  });

  describe('authentication with BoardProvider', () => {
    it('uses BoardProvider isAuthenticated when available', () => {
      mockBoardProvider = {
        isAuthenticated: true,
        logbook: [],
      };
      mockSessionStatus = 'unauthenticated'; // Session says no, but provider says yes
      const props = createTestProps();
      const { result } = renderHook(() => TickAction(props));
      expect(result.current.available).toBe(true);
    });
  });

  describe('logbook integration', () => {
    it('shows badge count from BoardProvider logbook', () => {
      mockBoardProvider = {
        isAuthenticated: true,
        logbook: [
          { climb_uuid: 'test-uuid-789', angle: 40, is_ascent: true },
          { climb_uuid: 'test-uuid-789', angle: 40, is_ascent: false },
        ],
      };
      const props = createTestProps();
      const { result } = renderHook(() => TickAction(props));
      expect(result.current.menuItem.label).toBe('Tick (2)');
    });

    it('uses standalone useLogbook when BoardProvider is absent', () => {
      mockBoardProvider = null;
      mockStandaloneLogbook = [
        { climb_uuid: 'test-uuid-789', angle: 40, is_ascent: true },
      ];
      const props = createTestProps();
      const { result } = renderHook(() => TickAction(props));
      expect(result.current.menuItem.label).toBe('Tick (1)');
    });

    it('shows no badge when standalone logbook is empty', () => {
      mockBoardProvider = null;
      mockStandaloneLogbook = [];
      const props = createTestProps();
      const { result } = renderHook(() => TickAction(props));
      expect(result.current.menuItem.label).toBe('Tick');
    });

    it('filters logbook by climb uuid and angle', () => {
      mockBoardProvider = {
        isAuthenticated: true,
        logbook: [
          { climb_uuid: 'test-uuid-789', angle: 40, is_ascent: true },
          { climb_uuid: 'other-uuid', angle: 40, is_ascent: true },
          { climb_uuid: 'test-uuid-789', angle: 25, is_ascent: true },
        ],
      };
      const props = createTestProps();
      const { result } = renderHook(() => TickAction(props));
      // Only the first entry matches both uuid and angle
      expect(result.current.menuItem.label).toBe('Tick (1)');
    });
  });

  describe('menuItem structure', () => {
    it('menuItem key is tick', () => {
      const props = createTestProps();
      const { result } = renderHook(() => TickAction(props));
      expect(result.current.menuItem.key).toBe('tick');
    });

    it('menuItem icon is defined', () => {
      const props = createTestProps();
      const { result } = renderHook(() => TickAction(props));
      expect(result.current.menuItem.icon).toBeDefined();
    });

    it('menuItem onClick is a function', () => {
      const props = createTestProps();
      const { result } = renderHook(() => TickAction(props));
      expect(typeof result.current.menuItem.onClick).toBe('function');
    });
  });
});
