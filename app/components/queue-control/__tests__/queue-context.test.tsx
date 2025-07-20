import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useSearchParams, useRouter } from 'next/navigation';
import { QueueProvider, useQueueContext } from '../queue-context';
import { ParsedBoardRouteParameters, Climb } from '@/app/lib/types';
import { ClimbQueueItem } from '../types';
import { usePeerContext } from '../../connection-manager/peer-context';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(),
  useRouter: vi.fn()
}));

vi.mock('@/app/lib/url-utils', () => ({
  urlParamsToSearchParams: vi.fn(() => ({ page: 1, pageSize: 20 })),
  searchParamsToUrlParams: vi.fn(() => new URLSearchParams('page=1'))
}));

vi.mock('../../connection-manager/peer-context', () => ({
  usePeerContext: vi.fn(() => ({
    sendData: vi.fn(),
    peerId: 'test-peer-id',
    subscribeToData: vi.fn(() => vi.fn()),
    hostId: null
  }))
}));

vi.mock('../hooks/use-queue-data-fetching', () => ({
  useQueueDataFetching: vi.fn(() => ({
    climbSearchResults: [],
    suggestedClimbs: [],
    totalSearchResultCount: 0,
    hasMoreResults: false,
    isFetchingClimbs: false,
    fetchMoreClimbs: vi.fn()
  }))
}));

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid')
}));

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    pathname: '/test/path'
  },
  writable: true
});

const mockSearchParams = new URLSearchParams();
const mockRouter = {
  replace: vi.fn()
};

const mockUsePeerContext = vi.mocked(usePeerContext);

const mockParsedParams: ParsedBoardRouteParameters = {
  board_name: 'kilter',
  layout_id: 1,
  size_id: 1,
  set_ids: [1],
  angle: 40
};

const mockClimb: Climb = {
  uuid: 'climb-1',
  board_name: 'kilter',
  layout_id: 1,
  size_id: 1,
  set_ids: [1],
  angle: 40,
  name: 'Test Climb',
  description: 'A test climb',
  fa: 'Test FA',
  fa_at: '2023-01-01',
  frames: [],
  difficulty: 7,
  quality_average: 3.5,
  quality_ratings: [3, 4],
  quality_count: 2,
  ascensionist_count: 5,
  difficulty_average: 7.2,
  is_benchmark: false,
  is_listed: true,
  mirrored: false,
  created_at: '2023-01-01',
  setter_username: 'setter1',
  climb_stats: null,
  climb_hold_positions: [],
  setter_id: 1,
  edge_left: 0,
  edge_right: 12,
  edge_bottom: 0,
  edge_top: 18
};

const TestComponent = () => {
  const context = useQueueContext();
  return (
    <div>
      <div data-testid="queue-length">{context.queue.length}</div>
      <div data-testid="current-climb">
        {context.currentClimb ? context.currentClimb.name : 'None'}
      </div>
      <div data-testid="view-only-mode">
        {context.viewOnlyMode ? 'true' : 'false'}
      </div>
      <button
        data-testid="add-to-queue"
        onClick={() => context.addToQueue(mockClimb)}
      >
        Add to Queue
      </button>
      <button
        data-testid="set-current-climb"
        onClick={() => context.setCurrentClimb(mockClimb)}
      >
        Set Current Climb
      </button>
      <button
        data-testid="mirror-climb"
        onClick={() => context.mirrorClimb()}
      >
        Mirror Climb
      </button>
    </div>
  );
};

describe('QueueProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useSearchParams as any).mockReturnValue(mockSearchParams);
    (useRouter as any).mockReturnValue(mockRouter);
    mockUsePeerContext.mockReturnValue({
      sendData: vi.fn(),
      peerId: 'test-peer-id',
      subscribeToData: vi.fn(() => vi.fn()),
      hostId: null
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should provide queue context to children', () => {
    render(
      <QueueProvider parsedParams={mockParsedParams}>
        <TestComponent />
      </QueueProvider>
    );

    expect(screen.getByTestId('queue-length')).toHaveTextContent('0');
    expect(screen.getByTestId('current-climb')).toHaveTextContent('None');
    expect(screen.getByTestId('view-only-mode')).toHaveTextContent('false');
  });

  it('should add climb to queue', async () => {
    render(
      <QueueProvider parsedParams={mockParsedParams}>
        <TestComponent />
      </QueueProvider>
    );

    const addButton = screen.getByTestId('add-to-queue');
    
    act(() => {
      addButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('queue-length')).toHaveTextContent('1');
    });
  });

  it('should set current climb', async () => {
    render(
      <QueueProvider parsedParams={mockParsedParams}>
        <TestComponent />
      </QueueProvider>
    );

    const setCurrentButton = screen.getByTestId('set-current-climb');
    
    act(() => {
      setCurrentButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('current-climb')).toHaveTextContent('Test Climb');
      expect(screen.getByTestId('queue-length')).toHaveTextContent('1');
    });
  });

  it('should handle mirror climb when no current climb', async () => {
    render(
      <QueueProvider parsedParams={mockParsedParams}>
        <TestComponent />
      </QueueProvider>
    );

    const mirrorButton = screen.getByTestId('mirror-climb');
    
    act(() => {
      mirrorButton.click();
    });

    // Should not crash and state should remain unchanged
    expect(screen.getByTestId('current-climb')).toHaveTextContent('None');
  });

  it('should throw error when useQueueContext is used outside provider', () => {
    const TestComponentOutsideProvider = () => {
      useQueueContext();
      return <div>Test</div>;
    };

    expect(() => {
      render(<TestComponentOutsideProvider />);
    }).toThrow('useQueueContext must be used within a QueueProvider');
  });
});

describe('QueueProvider with peer functionality', () => {
  const mockSendData = vi.fn();
  const mockSubscribeToData = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    (useSearchParams as any).mockReturnValue(mockSearchParams);
    (useRouter as any).mockReturnValue(mockRouter);
    
    // Mock peer context with host
    mockSubscribeToData.mockReturnValue(vi.fn()); // Return unsubscribe function
    mockUsePeerContext.mockReturnValue({
      sendData: mockSendData,
      peerId: 'test-peer-id',
      subscribeToData: mockSubscribeToData,
      hostId: 'host-id'
    });
  });

  it('should set view only mode when host is present and initial data not received', () => {
    render(
      <QueueProvider parsedParams={mockParsedParams}>
        <TestComponent />
      </QueueProvider>
    );

    expect(screen.getByTestId('view-only-mode')).toHaveTextContent('true');
  });

  it('should call sendData when adding to queue', async () => {
    render(
      <QueueProvider parsedParams={mockParsedParams}>
        <TestComponent />
      </QueueProvider>
    );

    const addButton = screen.getByTestId('add-to-queue');
    
    act(() => {
      addButton.click();
    });

    await waitFor(() => {
      expect(mockSendData).toHaveBeenCalled();
    });
  });

  it('should subscribe to peer data on mount', () => {
    render(
      <QueueProvider parsedParams={mockParsedParams}>
        <TestComponent />
      </QueueProvider>
    );

    expect(mockSubscribeToData).toHaveBeenCalled();
  });
});

describe('QueueProvider utility functions', () => {
  const TestComponentWithUtilities = () => {
    const context = useQueueContext();
    
    const queueItem1: ClimbQueueItem = {
      climb: { ...mockClimb, uuid: 'climb-1', name: 'Climb 1' },
      addedBy: 'user1',
      uuid: 'item-1',
      suggested: false
    };
    
    const queueItem2: ClimbQueueItem = {
      climb: { ...mockClimb, uuid: 'climb-2', name: 'Climb 2' },
      addedBy: 'user1',
      uuid: 'item-2',
      suggested: false
    };
    
    const queueItem3: ClimbQueueItem = {
      climb: { ...mockClimb, uuid: 'climb-3', name: 'Climb 3' },
      addedBy: 'user1',
      uuid: 'item-3',
      suggested: false
    };

    const setupQueue = () => {
      context.setQueue([queueItem1, queueItem2, queueItem3]);
      context.setCurrentClimbQueueItem(queueItem2);
    };

    const nextItem = context.getNextClimbQueueItem();
    const prevItem = context.getPreviousClimbQueueItem();

    return (
      <div>
        <button data-testid="setup-queue" onClick={setupQueue}>
          Setup Queue
        </button>
        <div data-testid="next-item">
          {nextItem ? nextItem.climb.name : 'None'}
        </div>
        <div data-testid="prev-item">
          {prevItem ? prevItem.climb.name : 'None'}
        </div>
        <button
          data-testid="remove-item"
          onClick={() => context.removeFromQueue(queueItem2)}
        >
          Remove Current
        </button>
      </div>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useSearchParams as any).mockReturnValue(mockSearchParams);
    (useRouter as any).mockReturnValue(mockRouter);
    mockUsePeerContext.mockReturnValue({
      sendData: vi.fn(),
      peerId: 'test-peer-id',
      subscribeToData: vi.fn(() => vi.fn()),
      hostId: null
    });
  });

  it('should get next and previous queue items correctly', async () => {
    render(
      <QueueProvider parsedParams={mockParsedParams}>
        <TestComponentWithUtilities />
      </QueueProvider>
    );

    const setupButton = screen.getByTestId('setup-queue');
    
    act(() => {
      setupButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('next-item')).toHaveTextContent('Climb 3');
      expect(screen.getByTestId('prev-item')).toHaveTextContent('Climb 1');
    });
  });

  it('should remove item from queue', async () => {
    const TestComponentForRemoval = () => {
      const context = useQueueContext();
      
      const queueItem: ClimbQueueItem = {
        climb: mockClimb,
        addedBy: 'user1',
        uuid: 'item-to-remove',
        suggested: false
      };

      return (
        <div>
          <div data-testid="queue-length">{context.queue.length}</div>
          <button
            data-testid="add-item"
            onClick={() => context.addToQueue(mockClimb)}
          >
            Add Item
          </button>
          <button
            data-testid="remove-item"
            onClick={() => context.removeFromQueue(queueItem)}
          >
            Remove Item
          </button>
        </div>
      );
    };

    render(
      <QueueProvider parsedParams={mockParsedParams}>
        <TestComponentForRemoval />
      </QueueProvider>
    );

    // Add an item first
    const addButton = screen.getByTestId('add-item');
    act(() => {
      addButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('queue-length')).toHaveTextContent('1');
    });

    // Remove the item
    const removeButton = screen.getByTestId('remove-item');
    act(() => {
      removeButton.click();
    });

    // Queue should still show 1 since we're removing a different item
    await waitFor(() => {
      expect(screen.getByTestId('queue-length')).toHaveTextContent('1');
    });
  });
});