import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useQueueDataFetching } from '../../hooks/use-queue-data-fetching';
import { ParsedBoardRouteParameters, SearchRequestPagination, Climb } from '@/app/lib/types';
import { ClimbQueue } from '../../types';
import useSWRInfinite from 'swr/infinite';
import { useBoardProvider } from '../../../board-provider/board-provider-context';

// Mock dependencies
vi.mock('swr/infinite', () => ({
  default: vi.fn()
}));

vi.mock('@/app/lib/url-utils', () => ({
  constructClimbSearchUrl: vi.fn(() => 'http://test.com/search'),
  searchParamsToUrlParams: vi.fn(() => new URLSearchParams('page=1'))
}));

vi.mock('../../../board-provider/board-provider-context', () => ({
  useBoardProvider: vi.fn(() => ({
    getLogbook: vi.fn()
  }))
}));

vi.mock('../../board-page/constants', () => ({
  PAGE_LIMIT: 20
}));

// Mock history.replaceState
Object.defineProperty(window, 'history', {
  value: {
    replaceState: vi.fn()
  },
  writable: true
});

Object.defineProperty(window, 'location', {
  value: {
    pathname: '/test/path'
  },
  writable: true
});

const mockUseSWRInfinite = vi.mocked(useSWRInfinite);
const mockUseBoardProvider = vi.mocked(useBoardProvider);

const mockClimb: Climb = {
  uuid: 'climb-1',
  setter_username: 'setter1',
  name: 'Test Climb',
  description: 'A test climb',
  frames: '',
  angle: 40,
  ascensionist_count: 5,
  difficulty: '7',
  quality_average: '3.5',
  stars: 3,
  difficulty_error: '',
  litUpHoldsMap: {},
  mirrored: false,
  benchmark_difficulty: null,
  userAscents: 0,
  userAttempts: 0
};

const mockSearchParams: SearchRequestPagination = {
  page: 1,
  pageSize: 20,
  gradeAccuracy: 1,
  maxGrade: 18,
  minAscents: 1,
  minGrade: 1,
  minRating: 1,
  sortBy: 'quality',
  sortOrder: 'desc',
  name: '',
  onlyClassics: false,
  onlyTallClimbs: false,
  settername: [],
  setternameSuggestion: '',
  holdsFilter: {},
  hideAttempted: false,
  hideCompleted: false,
  showOnlyAttempted: false,
  showOnlyCompleted: false
};

const mockParsedParams: ParsedBoardRouteParameters = {
  board_name: 'kilter',
  layout_id: 1,
  size_id: 1,
  set_ids: [1],
  angle: 40
};

const mockQueue: ClimbQueue = [];

describe('useQueueDataFetching', () => {
  const mockSetHasDoneFirstFetch = vi.fn();
  const mockGetLogbook = vi.fn();
  const mockSetSize = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseBoardProvider.mockReturnValue({
      isAuthenticated: true,
      token: 'mock-token',
      user_id: 123,
      username: 'testuser',
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
      error: null,
      isInitialized: true,
      getLogbook: mockGetLogbook,
      logbook: [],
      saveAscent: vi.fn(),
      saveClimb: vi.fn(),
      boardName: 'kilter'
    });

    mockUseSWRInfinite.mockReturnValue({
      data: [
        {
          climbs: [mockClimb],
          totalCount: 50
        }
      ],
      size: 1,
      setSize: mockSetSize,
      isLoading: false,
      mutate: vi.fn(),
      error: undefined,
      isValidating: false
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return climb search results and suggested climbs', () => {
    const { result } = renderHook(() =>
      useQueueDataFetching({
        searchParams: mockSearchParams,
        queue: mockQueue,
        parsedParams: mockParsedParams,
        hasDoneFirstFetch: false,
        setHasDoneFirstFetch: mockSetHasDoneFirstFetch
      })
    );

    expect(result.current.climbSearchResults).toEqual([mockClimb]);
    expect(result.current.suggestedClimbs).toEqual([mockClimb]);
    expect(result.current.totalSearchResultCount).toBe(50);
    expect(result.current.hasMoreResults).toBe(true);
    expect(result.current.isFetchingClimbs).toBe(false);
  });

  it('should filter out climbs already in queue from suggestions', () => {
    const queueWithClimb: ClimbQueue = [
      {
        climb: mockClimb,
        addedBy: 'user1',
        uuid: 'queue-item-1',
        suggested: false
      }
    ];

    const { result } = renderHook(() =>
      useQueueDataFetching({
        searchParams: mockSearchParams,
        queue: queueWithClimb,
        parsedParams: mockParsedParams,
        hasDoneFirstFetch: false,
        setHasDoneFirstFetch: mockSetHasDoneFirstFetch
      })
    );

    expect(result.current.climbSearchResults).toEqual([mockClimb]);
    expect(result.current.suggestedClimbs).toEqual([]);
  });

  it('should call setHasDoneFirstFetch when first results are available', async () => {
    renderHook(() =>
      useQueueDataFetching({
        searchParams: mockSearchParams,
        queue: mockQueue,
        parsedParams: mockParsedParams,
        hasDoneFirstFetch: false,
        setHasDoneFirstFetch: mockSetHasDoneFirstFetch
      })
    );

    await waitFor(() => {
      expect(mockSetHasDoneFirstFetch).toHaveBeenCalled();
    });
  });

  it('should not call setHasDoneFirstFetch if already done', () => {
    renderHook(() =>
      useQueueDataFetching({
        searchParams: mockSearchParams,
        queue: mockQueue,
        parsedParams: mockParsedParams,
        hasDoneFirstFetch: true,
        setHasDoneFirstFetch: mockSetHasDoneFirstFetch
      })
    );

    expect(mockSetHasDoneFirstFetch).not.toHaveBeenCalled();
  });

  it('should call getLogbook with climb UUIDs', async () => {
    renderHook(() =>
      useQueueDataFetching({
        searchParams: mockSearchParams,
        queue: mockQueue,
        parsedParams: mockParsedParams,
        hasDoneFirstFetch: false,
        setHasDoneFirstFetch: mockSetHasDoneFirstFetch
      })
    );

    await waitFor(() => {
      expect(mockGetLogbook).toHaveBeenCalledWith(['climb-1']);
    });
  });

  it('should handle empty search results', () => {
    mockUseSWRInfinite.mockReturnValue({
      data: undefined,
      size: 1,
      setSize: mockSetSize,
      isLoading: false,
      mutate: vi.fn(),
      error: undefined,
      isValidating: false
    });

    const { result } = renderHook(() =>
      useQueueDataFetching({
        searchParams: mockSearchParams,
        queue: mockQueue,
        parsedParams: mockParsedParams,
        hasDoneFirstFetch: false,
        setHasDoneFirstFetch: mockSetHasDoneFirstFetch
      })
    );

    expect(result.current.climbSearchResults).toBeNull();
    expect(result.current.suggestedClimbs).toEqual([]);
    expect(result.current.totalSearchResultCount).toBeNull();
    expect(result.current.hasMoreResults).toBeFalsy();
  });

  it('should handle fetchMoreClimbs', () => {
    const { result } = renderHook(() =>
      useQueueDataFetching({
        searchParams: mockSearchParams,
        queue: mockQueue,
        parsedParams: mockParsedParams,
        hasDoneFirstFetch: false,
        setHasDoneFirstFetch: mockSetHasDoneFirstFetch
      })
    );

    result.current.fetchMoreClimbs();

    expect(mockSetSize).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should calculate hasMoreResults correctly', () => {
    // Test case where there are more results
    mockUseSWRInfinite.mockReturnValue({
      data: [
        {
          climbs: Array(20).fill(mockClimb),
          totalCount: 50
        }
      ],
      size: 1,
      setSize: mockSetSize,
      isLoading: false,
      mutate: vi.fn(),
      error: undefined,
      isValidating: false
    });

    const { result } = renderHook(() =>
      useQueueDataFetching({
        searchParams: mockSearchParams,
        queue: mockQueue,
        parsedParams: mockParsedParams,
        hasDoneFirstFetch: false,
        setHasDoneFirstFetch: mockSetHasDoneFirstFetch
      })
    );

    expect(result.current.hasMoreResults).toBe(true);
  });

  it('should handle no more results case', () => {
    mockUseSWRInfinite.mockReturnValue({
      data: [
        {
          climbs: Array(10).fill(mockClimb),
          totalCount: 10
        }
      ],
      size: 1,
      setSize: mockSetSize,
      isLoading: false,
      mutate: vi.fn(),
      error: undefined,
      isValidating: false
    });

    const { result } = renderHook(() =>
      useQueueDataFetching({
        searchParams: mockSearchParams,
        queue: mockQueue,
        parsedParams: mockParsedParams,
        hasDoneFirstFetch: false,
        setHasDoneFirstFetch: mockSetHasDoneFirstFetch
      })
    );

    expect(result.current.hasMoreResults).toBe(false);
  });

  it('should combine UUIDs from search results and queue', async () => {
    const anotherClimb: Climb = { ...mockClimb, uuid: 'climb-2' };
    const queueWithClimb: ClimbQueue = [
      {
        climb: anotherClimb,
        addedBy: 'user1',
        uuid: 'queue-item-1',
        suggested: false
      }
    ];

    renderHook(() =>
      useQueueDataFetching({
        searchParams: mockSearchParams,
        queue: queueWithClimb,
        parsedParams: mockParsedParams,
        hasDoneFirstFetch: false,
        setHasDoneFirstFetch: mockSetHasDoneFirstFetch
      })
    );

    await waitFor(() => {
      expect(mockGetLogbook).toHaveBeenCalledWith(['climb-1', 'climb-2']);
    });
  });

  it('should not call getLogbook if UUIDs have not changed', async () => {
    const { rerender } = renderHook(() =>
      useQueueDataFetching({
        searchParams: mockSearchParams,
        queue: mockQueue,
        parsedParams: mockParsedParams,
        hasDoneFirstFetch: false,
        setHasDoneFirstFetch: mockSetHasDoneFirstFetch
      })
    );

    await waitFor(() => {
      expect(mockGetLogbook).toHaveBeenCalledTimes(1);
    });

    // Clear the mock and rerender with same data
    mockGetLogbook.mockClear();
    
    rerender();

    // Should not call getLogbook again
    expect(mockGetLogbook).not.toHaveBeenCalled();
  });
});