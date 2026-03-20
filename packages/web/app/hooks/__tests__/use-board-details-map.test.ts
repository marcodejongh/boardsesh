import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// Mock dependencies
vi.mock('@/app/lib/board-config-for-playlist', () => ({
  getUserBoardDetails: vi.fn(),
  getBoardDetailsForPlaylist: vi.fn(),
}));

import { useBoardDetailsMap } from '../use-board-details-map';
import { getUserBoardDetails, getBoardDetailsForPlaylist } from '@/app/lib/board-config-for-playlist';
import type { UserBoard } from '@boardsesh/shared-schema';
import type { Climb, BoardDetails } from '@/app/lib/types';

const mockGetUserBoardDetails = vi.mocked(getUserBoardDetails);
const mockGetBoardDetailsForPlaylist = vi.mocked(getBoardDetailsForPlaylist);

function makeClimb(overrides: Partial<Climb> = {}): Climb {
  return {
    uuid: 'climb-1',
    name: 'Test Climb',
    frames: '',
    angle: 40,
    difficulty: 'V5',
    quality_average: '3',
    setter_username: 'setter1',
    litUpHoldsMap: {},
    description: '',
    ascensionist_count: 0,
    stars: 3,
    difficulty_error: '0',
    benchmark_difficulty: null,
    boardType: 'kilter',
    layoutId: 1,
    ...overrides,
  };
}

function makeUserBoard(overrides: Partial<UserBoard> = {}): UserBoard {
  return {
    uuid: 'board-1',
    boardType: 'kilter',
    layoutId: 1,
    sizeId: 10,
    setIds: '1,2,3',
    angle: 40,
    ...overrides,
  } as UserBoard;
}

function makeBoardDetails(name: string): BoardDetails {
  return {
    board_name: name,
    layout_id: 1,
    size_id: 10,
    set_ids: [1, 2, 3],
    boardWidth: 100,
    boardHeight: 150,
    holdsData: {},
    litUpHoldsGroupSets: [],
    edgeLeft: 0,
    edgeRight: 100,
    edgeBottom: 0,
    edgeTop: 150,
  } as unknown as BoardDetails;
}

describe('useBoardDetailsMap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty map when no climbs provided', () => {
    const { result } = renderHook(() =>
      useBoardDetailsMap([], []),
    );

    expect(Object.keys(result.current.boardDetailsMap)).toHaveLength(0);
    expect(result.current.unsupportedClimbs.size).toBe(0);
  });

  it('should build boardDetailsMap keyed by "boardType:layoutId"', () => {
    const climb = makeClimb({ boardType: 'kilter', layoutId: 1 });
    const genericDetails = makeBoardDetails('kilter');
    mockGetBoardDetailsForPlaylist.mockReturnValue(genericDetails);

    const { result } = renderHook(() =>
      useBoardDetailsMap([climb], []),
    );

    expect(result.current.boardDetailsMap['kilter:1']).toBe(genericDetails);
  });

  it('should prefer user board details over generic details', () => {
    const climb = makeClimb({ boardType: 'kilter', layoutId: 1 });
    const userBoard = makeUserBoard({ boardType: 'kilter', layoutId: 1 });
    const userDetails = makeBoardDetails('kilter-user');
    const genericDetails = makeBoardDetails('kilter-generic');

    mockGetUserBoardDetails.mockReturnValue(userDetails);
    mockGetBoardDetailsForPlaylist.mockReturnValue(genericDetails);

    const { result } = renderHook(() =>
      useBoardDetailsMap([climb], [userBoard]),
    );

    expect(result.current.boardDetailsMap['kilter:1']).toBe(userDetails);
    // Generic should NOT be called because user board took precedence
    expect(mockGetBoardDetailsForPlaylist).not.toHaveBeenCalled();
  });

  it('should fall back to generic details when user does not own that board', () => {
    const climb = makeClimb({ boardType: 'tension', layoutId: 2 });
    const genericDetails = makeBoardDetails('tension');

    mockGetBoardDetailsForPlaylist.mockReturnValue(genericDetails);

    const { result } = renderHook(() =>
      useBoardDetailsMap([climb], []),
    );

    expect(result.current.boardDetailsMap['tension:2']).toBe(genericDetails);
    expect(mockGetBoardDetailsForPlaylist).toHaveBeenCalledWith('tension', 2);
  });

  it('should populate unsupportedClimbs set for board types user does not own', () => {
    const climb1 = makeClimb({ uuid: 'c1', boardType: 'kilter', layoutId: 1 });
    const climb2 = makeClimb({ uuid: 'c2', boardType: 'tension', layoutId: 2 });
    const userBoard = makeUserBoard({ boardType: 'kilter', layoutId: 1 });

    const kilterDetails = makeBoardDetails('kilter');
    const tensionDetails = makeBoardDetails('tension');
    mockGetUserBoardDetails.mockReturnValue(kilterDetails);
    mockGetBoardDetailsForPlaylist.mockReturnValue(tensionDetails);

    const { result } = renderHook(() =>
      useBoardDetailsMap([climb1, climb2], [userBoard]),
    );

    // Kilter climb is supported (user owns kilter board)
    expect(result.current.unsupportedClimbs.has('c1')).toBe(false);
    // Tension climb is unsupported (user doesn't own tension board)
    expect(result.current.unsupportedClimbs.has('c2')).toBe(true);
  });

  it('should return defaultBoardDetails from selectedBoard when provided', () => {
    const selectedBoard = makeUserBoard({ boardType: 'kilter', layoutId: 1 });
    const selectedDetails = makeBoardDetails('kilter-selected');

    mockGetUserBoardDetails.mockReturnValue(selectedDetails);

    const { result } = renderHook(() =>
      useBoardDetailsMap([], [], selectedBoard),
    );

    expect(result.current.defaultBoardDetails).toBe(selectedDetails);
  });

  it('should return defaultBoardDetails from first myBoard as fallback', () => {
    const myBoard = makeUserBoard({ boardType: 'kilter', layoutId: 1 });
    const myBoardDetails = makeBoardDetails('kilter-mine');

    mockGetUserBoardDetails.mockReturnValue(myBoardDetails);

    const { result } = renderHook(() =>
      useBoardDetailsMap([], [myBoard]),
    );

    expect(result.current.defaultBoardDetails).toBe(myBoardDetails);
  });

  it('should use fallbackBoardTypes for default details when no boards available', () => {
    const genericDetails = makeBoardDetails('tension');
    mockGetBoardDetailsForPlaylist.mockReturnValue(genericDetails);

    const { result } = renderHook(() =>
      useBoardDetailsMap([], [], null, ['tension']),
    );

    expect(result.current.defaultBoardDetails).toBe(genericDetails);
    expect(mockGetBoardDetailsForPlaylist).toHaveBeenCalledWith('tension', null);
  });

  it('should handle multiple climbs from different board types', () => {
    const climb1 = makeClimb({ uuid: 'c1', boardType: 'kilter', layoutId: 1 });
    const climb2 = makeClimb({ uuid: 'c2', boardType: 'tension', layoutId: 2 });
    const climb3 = makeClimb({ uuid: 'c3', boardType: 'kilter', layoutId: 1 }); // duplicate key

    const kilterDetails = makeBoardDetails('kilter');
    const tensionDetails = makeBoardDetails('tension');

    mockGetBoardDetailsForPlaylist
      .mockReturnValueOnce(kilterDetails)
      .mockReturnValueOnce(tensionDetails);

    const { result } = renderHook(() =>
      useBoardDetailsMap([climb1, climb2, climb3], []),
    );

    // Only 2 unique keys in the boardDetailsMap
    expect(Object.keys(result.current.boardDetailsMap)).toHaveLength(2);
    expect(result.current.boardDetailsMap['kilter:1']).toBe(kilterDetails);
    expect(result.current.boardDetailsMap['tension:2']).toBe(tensionDetails);
  });

  it('should skip climbs without boardType or layoutId', () => {
    const climb1 = makeClimb({ uuid: 'c1', boardType: undefined, layoutId: 1 });
    const climb2 = makeClimb({ uuid: 'c2', boardType: 'kilter', layoutId: null });

    const { result } = renderHook(() =>
      useBoardDetailsMap([climb1, climb2], []),
    );

    expect(Object.keys(result.current.boardDetailsMap)).toHaveLength(0);
  });
});
