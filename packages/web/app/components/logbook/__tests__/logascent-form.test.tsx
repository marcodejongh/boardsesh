import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRef } from 'react';

// === Mock setup ===

const mockExecuteGraphQL = vi.fn().mockResolvedValue({});
vi.mock('@/app/lib/graphql/client', () => ({
  executeGraphQL: (...args: unknown[]) => mockExecuteGraphQL(...args),
}));

vi.mock('@/app/lib/graphql/operations', () => ({
  SAVE_TICK: 'SAVE_TICK_QUERY',
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

let mockWsAuthToken: string | null = 'test-token-123';
vi.mock('@/app/hooks/use-ws-auth-token', () => ({
  useWsAuthToken: () => ({ token: mockWsAuthToken, isLoading: false }),
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
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { executeGraphQL } from '@/app/lib/graphql/client';
import { SAVE_TICK } from '@/app/lib/graphql/operations';

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
  const { token: wsAuthToken } = useWsAuthToken();
  const isAuthenticated = bp?.isAuthenticated ?? (sessionStatus === 'authenticated');

  const wsAuthTokenRef = useRef(wsAuthToken);
  wsAuthTokenRef.current = wsAuthToken;

  const saveTick = bp?.saveTick ?? (async (options: SaveTickOptions) => {
    await executeGraphQL(
      SAVE_TICK,
      { input: { ...options, boardType: boardDetails.board_name } },
      wsAuthTokenRef.current,
    );
  });

  return { saveTick, isAuthenticated };
}

describe('LogAscentForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBoardProvider = null;
    mockSessionStatus = 'unauthenticated';
    mockWsAuthToken = 'test-token-123';
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
      expect(mockExecuteGraphQL).not.toHaveBeenCalled();
    });

    it('falls back to executeGraphQL when BoardProvider is absent', async () => {
      mockBoardProvider = null;
      mockWsAuthToken = 'fallback-token';

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

      expect(mockExecuteGraphQL).toHaveBeenCalledWith(
        'SAVE_TICK_QUERY',
        { input: { ...tickOptions, boardType: 'kilter' } },
        'fallback-token',
      );
    });

    it('spreads all SaveTickOptions fields into the GraphQL input', async () => {
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

      const callArgs = mockExecuteGraphQL.mock.calls[0];
      const input = callArgs[1].input;

      expect(input.boardType).toBe('tension');
      expect(input.climbUuid).toBe('uuid-456');
      expect(input.angle).toBe(25);
      expect(input.isMirror).toBe(true);
      expect(input.status).toBe('attempt');
      expect(input.attemptCount).toBe(5);
      expect(input.quality).toBe(4);
      expect(input.difficulty).toBe(10);
      expect(input.isBenchmark).toBe(true);
      expect(input.comment).toBe('Hard one');
      expect(input.sessionId).toBe('session-1');
      expect(input.layoutId).toBe(2);
      expect(input.sizeId).toBe(15);
      expect(input.setIds).toBe('3,4');
    });

    it('uses fresh token via ref when token changes after initial render', async () => {
      mockBoardProvider = null;
      mockWsAuthToken = 'old-token';

      const boardDetails = createTestBoardDetails();
      const { result, rerender } = renderHook(() => useSaveTickLogic(boardDetails));

      // Simulate token refresh
      mockWsAuthToken = 'new-token';
      rerender();

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

      // Should use the new token, not the stale one
      expect(mockExecuteGraphQL).toHaveBeenCalledWith(
        'SAVE_TICK_QUERY',
        expect.any(Object),
        'new-token',
      );
    });
  });
});
