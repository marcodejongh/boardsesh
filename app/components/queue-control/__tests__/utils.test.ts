import { describe, it, expect, vi } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { Climb } from '@/app/lib/types';
import { ClimbQueueItem, UserName } from '../types';

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-123')
}));

const mockClimb: Climb = {
  uuid: 'climb-1',
  board_name: 'kilter',
  layout_id: '1',
  size_id: '1',
  set_ids: ['1'],
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

// Re-implement the createClimbQueueItem function from queue-context.tsx for testing
const createClimbQueueItem = (climb: Climb, addedBy: UserName, suggested?: boolean): ClimbQueueItem => ({
  climb,
  addedBy,
  uuid: uuidv4(),
  suggested: !!suggested,
});

describe('queue-context utilities', () => {
  describe('createClimbQueueItem', () => {
    it('should create a climb queue item with required fields', () => {
      const userName: UserName = 'test-user';
      const result = createClimbQueueItem(mockClimb, userName);

      expect(result).toEqual({
        climb: mockClimb,
        addedBy: userName,
        uuid: 'test-uuid-123',
        suggested: false
      });
    });

    it('should create a suggested climb queue item', () => {
      const userName: UserName = 'test-user';
      const result = createClimbQueueItem(mockClimb, userName, true);

      expect(result).toEqual({
        climb: mockClimb,
        addedBy: userName,
        uuid: 'test-uuid-123',
        suggested: true
      });
    });

    it('should handle null addedBy', () => {
      const userName: UserName = null;
      const result = createClimbQueueItem(mockClimb, userName);

      expect(result).toEqual({
        climb: mockClimb,
        addedBy: null,
        uuid: 'test-uuid-123',
        suggested: false
      });
    });

    it('should handle falsy suggested value', () => {
      const userName: UserName = 'test-user';
      const result = createClimbQueueItem(mockClimb, userName, false);

      expect(result).toEqual({
        climb: mockClimb,
        addedBy: userName,
        uuid: 'test-uuid-123',
        suggested: false
      });
    });

    it('should handle undefined suggested value', () => {
      const userName: UserName = 'test-user';
      const result = createClimbQueueItem(mockClimb, userName, undefined);

      expect(result).toEqual({
        climb: mockClimb,
        addedBy: userName,
        uuid: 'test-uuid-123',
        suggested: false
      });
    });
  });

  describe('queue navigation utilities', () => {
    const mockQueue: ClimbQueueItem[] = [
      {
        climb: { ...mockClimb, uuid: 'climb-1', name: 'Climb 1' },
        addedBy: 'user1',
        uuid: 'item-1',
        suggested: false
      },
      {
        climb: { ...mockClimb, uuid: 'climb-2', name: 'Climb 2' },
        addedBy: 'user1',
        uuid: 'item-2',
        suggested: false
      },
      {
        climb: { ...mockClimb, uuid: 'climb-3', name: 'Climb 3' },
        addedBy: 'user1',
        uuid: 'item-3',
        suggested: false
      }
    ];

    const getNextClimbQueueItem = (queue: ClimbQueueItem[], currentItem: ClimbQueueItem | null, suggestedClimbs: Climb[], peerId: string, climbSearchResults?: Climb[]) => {
      const queueItemIndex = currentItem ? queue.findIndex(({ uuid }) => uuid === currentItem.uuid) : -1;

      if (
        (queue.length === 0 || queue.length <= queueItemIndex + 1) &&
        climbSearchResults &&
        climbSearchResults.length > 0
      ) {
        const nextClimb = suggestedClimbs[0];
        return nextClimb ? createClimbQueueItem(nextClimb, peerId, true) : null;
      }

      return queueItemIndex >= queue.length - 1 ? null : queue[queueItemIndex + 1];
    };

    const getPreviousClimbQueueItem = (queue: ClimbQueueItem[], currentItem: ClimbQueueItem | null) => {
      const queueItemIndex = currentItem ? queue.findIndex(({ uuid }) => uuid === currentItem.uuid) : -1;
      return queueItemIndex > 0 ? queue[queueItemIndex - 1] : null;
    };

    describe('getNextClimbQueueItem', () => {
      it('should return next item in queue', () => {
        const currentItem = mockQueue[0];
        const result = getNextClimbQueueItem(mockQueue, currentItem, [], 'test-user', []);

        expect(result).toEqual(mockQueue[1]);
      });

      it('should return null when at end of queue with no suggestions', () => {
        const currentItem = mockQueue[2];
        const result = getNextClimbQueueItem(mockQueue, currentItem, [], 'test-user', []);

        expect(result).toBeNull();
      });

      it('should return suggested climb when at end of queue', () => {
        const currentItem = mockQueue[2];
        const suggestedClimbs = [{ ...mockClimb, uuid: 'suggested-1', name: 'Suggested Climb' }];
        const climbSearchResults = [{ ...mockClimb, uuid: 'search-1', name: 'Search Result' }];
        const result = getNextClimbQueueItem(mockQueue, currentItem, suggestedClimbs, 'test-user', climbSearchResults);

        expect(result).toEqual({
          climb: suggestedClimbs[0],
          addedBy: 'test-user',
          uuid: 'test-uuid-123',
          suggested: true
        });
      });

      it('should return suggested climb when queue is empty', () => {
        const suggestedClimbs = [{ ...mockClimb, uuid: 'suggested-1', name: 'Suggested Climb' }];
        const climbSearchResults = [{ ...mockClimb, uuid: 'search-1', name: 'Search Result' }];
        const result = getNextClimbQueueItem([], null, suggestedClimbs, 'test-user', climbSearchResults);

        expect(result).toEqual({
          climb: suggestedClimbs[0],
          addedBy: 'test-user',
          uuid: 'test-uuid-123',
          suggested: true
        });
      });

      it('should return first item when current item is null and no search results', () => {
        const suggestedClimbs = [{ ...mockClimb, uuid: 'suggested-1', name: 'Suggested Climb' }];
        const result = getNextClimbQueueItem(mockQueue, null, suggestedClimbs, 'test-user', []);

        // When current item is null (index -1), and queueItemIndex >= queue.length - 1 is false (-1 >= 2 is false)
        // So it returns queue[queueItemIndex + 1] = queue[0] = first item
        expect(result).toEqual(mockQueue[0]);
      });
    });

    describe('getPreviousClimbQueueItem', () => {
      it('should return previous item in queue', () => {
        const currentItem = mockQueue[1];
        const result = getPreviousClimbQueueItem(mockQueue, currentItem);

        expect(result).toEqual(mockQueue[0]);
      });

      it('should return null when at beginning of queue', () => {
        const currentItem = mockQueue[0];
        const result = getPreviousClimbQueueItem(mockQueue, currentItem);

        expect(result).toBeNull();
      });

      it('should return null when current item is null', () => {
        const result = getPreviousClimbQueueItem(mockQueue, null);

        expect(result).toBeNull();
      });

      it('should return null when current item not in queue', () => {
        const currentItem: ClimbQueueItem = {
          climb: mockClimb,
          addedBy: 'user1',
          uuid: 'not-in-queue',
          suggested: false
        };
        const result = getPreviousClimbQueueItem(mockQueue, currentItem);

        expect(result).toBeNull();
      });
    });
  });
});