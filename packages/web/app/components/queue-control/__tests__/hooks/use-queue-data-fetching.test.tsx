import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useQueueDataFetching } from '../../hooks/use-queue-data-fetching';
import { ParsedBoardRouteParameters, SearchRequestPagination, Climb } from '@/app/lib/types';
import { ClimbQueue } from '../../types';
import { useBoardProvider } from '../../../board-provider/board-provider-context';
import React from 'react';

// Mock dependencies
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

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

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

// Create a wrapper with QueryClientProvider
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'QueryClientWrapper';
  return Wrapper;
};

describe('useQueueDataFetching', () => {
  const mockSetHasDoneFirstFetch = vi.fn();
  const mockGetLogbook = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseBoardProvider.mockReturnValue({
      isAuthenticated: true,
      hasAuroraCredentials: true,
      token: 'mock-token',
      user_id: 123,
      username: 'testuser',
      isLoading: false,
      error: null,
      isInitialized: true,
      getLogbook: mockGetLogbook,
      logbook: [],
      saveAscent: vi.fn(),
      saveClimb: vi.fn(),
      boardName: 'kilter'
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        climbs: [mockClimb],
        totalCount: 50
      })
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return climb search results and suggested climbs', async () => {
    const { result } = renderHook(
      () =>
        useQueueDataFetching({
          searchParams: mockSearchParams,
          queue: mockQueue,
          parsedParams: mockParsedParams,
          hasDoneFirstFetch: false,
          setHasDoneFirstFetch: mockSetHasDoneFirstFetch
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.climbSearchResults).toEqual([mockClimb]);
    });

    expect(result.current.suggestedClimbs).toEqual([mockClimb]);
    expect(result.current.totalSearchResultCount).toBe(50);
    expect(result.current.hasMoreResults).toBe(true);
  });

  it('should filter out climbs already in queue from suggestions', async () => {
    const queueWithClimb: ClimbQueue = [
      {
        climb: mockClimb,
        addedBy: 'user1',
        uuid: 'queue-item-1',
        suggested: false
      }
    ];

    const { result } = renderHook(
      () =>
        useQueueDataFetching({
          searchParams: mockSearchParams,
          queue: queueWithClimb,
          parsedParams: mockParsedParams,
          hasDoneFirstFetch: false,
          setHasDoneFirstFetch: mockSetHasDoneFirstFetch
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.climbSearchResults).toEqual([mockClimb]);
    });

    expect(result.current.suggestedClimbs).toEqual([]);
  });

  it('should call setHasDoneFirstFetch when first results are available', async () => {
    renderHook(
      () =>
        useQueueDataFetching({
          searchParams: mockSearchParams,
          queue: mockQueue,
          parsedParams: mockParsedParams,
          hasDoneFirstFetch: false,
          setHasDoneFirstFetch: mockSetHasDoneFirstFetch
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(mockSetHasDoneFirstFetch).toHaveBeenCalled();
    });
  });

  it('should not call setHasDoneFirstFetch if already done', async () => {
    const { result } = renderHook(
      () =>
        useQueueDataFetching({
          searchParams: mockSearchParams,
          queue: mockQueue,
          parsedParams: mockParsedParams,
          hasDoneFirstFetch: true,
          setHasDoneFirstFetch: mockSetHasDoneFirstFetch
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.climbSearchResults).toBeDefined();
    });

    expect(mockSetHasDoneFirstFetch).not.toHaveBeenCalled();
  });

  it('should call getLogbook with climb UUIDs', async () => {
    renderHook(
      () =>
        useQueueDataFetching({
          searchParams: mockSearchParams,
          queue: mockQueue,
          parsedParams: mockParsedParams,
          hasDoneFirstFetch: false,
          setHasDoneFirstFetch: mockSetHasDoneFirstFetch
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(mockGetLogbook).toHaveBeenCalledWith(['climb-1']);
    });
  });

  it('should handle empty search results', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        climbs: [],
        totalCount: 0
      })
    });

    const { result } = renderHook(
      () =>
        useQueueDataFetching({
          searchParams: mockSearchParams,
          queue: mockQueue,
          parsedParams: mockParsedParams,
          hasDoneFirstFetch: false,
          setHasDoneFirstFetch: mockSetHasDoneFirstFetch
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.climbSearchResults).toEqual([]);
    });

    expect(result.current.suggestedClimbs).toEqual([]);
    expect(result.current.totalSearchResultCount).toBe(0);
    expect(result.current.hasMoreResults).toBe(false);
  });

  it('should calculate hasMoreResults correctly when there are more results', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        climbs: Array(20).fill(mockClimb),
        totalCount: 50
      })
    });

    const { result } = renderHook(
      () =>
        useQueueDataFetching({
          searchParams: mockSearchParams,
          queue: mockQueue,
          parsedParams: mockParsedParams,
          hasDoneFirstFetch: false,
          setHasDoneFirstFetch: mockSetHasDoneFirstFetch
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.hasMoreResults).toBe(true);
    });
  });

  it('should handle no more results case', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        climbs: Array(10).fill(mockClimb),
        totalCount: 10
      })
    });

    const { result } = renderHook(
      () =>
        useQueueDataFetching({
          searchParams: mockSearchParams,
          queue: mockQueue,
          parsedParams: mockParsedParams,
          hasDoneFirstFetch: false,
          setHasDoneFirstFetch: mockSetHasDoneFirstFetch
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.hasMoreResults).toBe(false);
    });
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

    renderHook(
      () =>
        useQueueDataFetching({
          searchParams: mockSearchParams,
          queue: queueWithClimb,
          parsedParams: mockParsedParams,
          hasDoneFirstFetch: false,
          setHasDoneFirstFetch: mockSetHasDoneFirstFetch
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(mockGetLogbook).toHaveBeenCalledWith(['climb-1', 'climb-2']);
    });
  });
});
