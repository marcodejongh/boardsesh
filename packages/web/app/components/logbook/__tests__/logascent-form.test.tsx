import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// === Mock setup ===

const mockMutateAsync = vi.fn().mockResolvedValue({});
vi.mock('@/app/hooks/use-save-tick', () => ({
  useSaveTick: () => ({ mutateAsync: mockMutateAsync }),
}));

vi.mock('@vercel/analytics', () => ({
  track: vi.fn(),
}));

let mockBoardProvider: {
  isAuthenticated: boolean;
  saveTick: ReturnType<typeof vi.fn>;
} | null = null;

vi.mock('@/app/components/board-provider/board-provider-context', () => ({
  useOptionalBoardProvider: () => mockBoardProvider,
}));

let mockSessionStatus = 'unauthenticated';
vi.mock('next-auth/react', () => ({
  useSession: () => ({ status: mockSessionStatus }),
}));

vi.mock('@/app/lib/board-data', () => ({
  TENSION_KILTER_GRADES: [
    { difficulty_id: 1, difficulty_name: 'V0' },
    { difficulty_id: 2, difficulty_name: 'V1' },
  ],
  ANGLES: {
    kilter: [0, 15, 20, 25, 30, 35, 40, 45, 50],
    tension: [0, 10, 20, 30, 40],
  },
}));

// Import the mocked modules at the top level (vitest resolves these to mocks)
import { useOptionalBoardProvider } from '@/app/components/board-provider/board-provider-context';
import { useSession } from 'next-auth/react';
import { useSaveTick } from '@/app/hooks/use-save-tick';

import type { BoardDetails } from '@/app/lib/types';
import type { SaveTickOptions } from '@/app/components/board-provider/board-provider-context';

function createTestBoardDetails(overrides?: Partial<BoardDetails>): BoardDetails {
  return {
    board_name: 'kilter',
    layout_id: 1,
    size_id: 10,
    set_ids: [1, 2],
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
    supportsMirroring: true,
    ...overrides,
  } as BoardDetails;
}

/**
 * Custom hook that mirrors the auth + saveTick logic from LogAscentForm.
 * This lets us test the delegation/fallback behavior in isolation
 * without rendering the full form with all its MUI dependencies.
 */
function useSaveTickLogic(boardDetails: BoardDetails) {
  const bp = useOptionalBoardProvider();
  const { status: sessionStatus } = useSession();
  const isAuthenticated = bp?.isAuthenticated ?? (sessionStatus === 'authenticated');

  const saveTickMutation = useSaveTick(boardDetails.board_name);
  const saveTick = bp?.saveTick ?? (async (options: SaveTickOptions) => {
    await saveTickMutation.mutateAsync(options);
  });

  return { saveTick, isAuthenticated };
}

describe('LogAscentForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBoardProvider = null;
    mockSessionStatus = 'unauthenticated';
  });

  describe('authentication fallback', () => {
    it('uses BoardProvider isAuthenticated when available', () => {
      mockBoardProvider = { isAuthenticated: true, saveTick: vi.fn() };
      mockSessionStatus = 'unauthenticated';

      const { result } = renderHook(() =>
        useSaveTickLogic(createTestBoardDetails()),
      );
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('falls back to session status when BoardProvider is absent', () => {
      mockBoardProvider = null;
      mockSessionStatus = 'authenticated';

      const { result } = renderHook(() =>
        useSaveTickLogic(createTestBoardDetails()),
      );
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('reports unauthenticated when both sources say no', () => {
      mockBoardProvider = null;
      mockSessionStatus = 'unauthenticated';

      const { result } = renderHook(() =>
        useSaveTickLogic(createTestBoardDetails()),
      );
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('saveTick delegation', () => {
    it('uses BoardProvider saveTick when available', async () => {
      const mockSaveTick = vi.fn().mockResolvedValue(undefined);
      mockBoardProvider = { isAuthenticated: true, saveTick: mockSaveTick };

      const { result } = renderHook(() =>
        useSaveTickLogic(createTestBoardDetails()),
      );

      const tickOptions: SaveTickOptions = {
        climbUuid: 'climb-uuid-123',
        angle: 40,
        isMirror: false,
        status: 'flash',
        attemptCount: 1,
        isBenchmark: false,
        comment: '',
        climbedAt: new Date().toISOString(),
      };

      await result.current.saveTick(tickOptions);
      expect(mockSaveTick).toHaveBeenCalledWith(tickOptions);
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });

    it('falls back to useSaveTick mutation when BoardProvider is absent', async () => {
      mockBoardProvider = null;

      const boardDetails = createTestBoardDetails({ board_name: 'kilter' });
      const { result } = renderHook(() => useSaveTickLogic(boardDetails));

      const tickOptions: SaveTickOptions = {
        climbUuid: 'climb-uuid-123',
        angle: 40,
        isMirror: false,
        status: 'send',
        attemptCount: 3,
        isBenchmark: false,
        comment: 'Nice!',
        climbedAt: '2025-01-01T00:00:00Z',
      };

      await result.current.saveTick(tickOptions);

      expect(mockMutateAsync).toHaveBeenCalledWith(tickOptions);
    });

    it('passes all SaveTickOptions fields to mutateAsync', async () => {
      mockBoardProvider = null;

      const boardDetails = createTestBoardDetails({ board_name: 'tension' });
      const { result } = renderHook(() => useSaveTickLogic(boardDetails));

      const tickOptions: SaveTickOptions = {
        climbUuid: 'uuid-456',
        angle: 25,
        isMirror: true,
        status: 'attempt',
        attemptCount: 5,
        quality: 4,
        difficulty: 10,
        isBenchmark: true,
        comment: 'Hard one',
        climbedAt: '2025-06-15T12:00:00Z',
        sessionId: 'session-1',
        layoutId: 2,
        sizeId: 15,
        setIds: '3,4',
      };

      await result.current.saveTick(tickOptions);

      const callArgs = mockMutateAsync.mock.calls[0][0];

      expect(callArgs.climbUuid).toBe('uuid-456');
      expect(callArgs.angle).toBe(25);
      expect(callArgs.isMirror).toBe(true);
      expect(callArgs.status).toBe('attempt');
      expect(callArgs.attemptCount).toBe(5);
      expect(callArgs.quality).toBe(4);
      expect(callArgs.difficulty).toBe(10);
      expect(callArgs.isBenchmark).toBe(true);
      expect(callArgs.comment).toBe('Hard one');
      expect(callArgs.sessionId).toBe('session-1');
      expect(callArgs.layoutId).toBe(2);
      expect(callArgs.sizeId).toBe(15);
      expect(callArgs.setIds).toBe('3,4');
    });
  });
});
