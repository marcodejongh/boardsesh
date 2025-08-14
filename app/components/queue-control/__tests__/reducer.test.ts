import { describe, it, expect } from 'vitest';
import { queueReducer } from '../reducer';
import { QueueState, QueueAction, ClimbQueueItem } from '../types';
import { SearchRequestPagination, Climb } from '@/app/lib/types';

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

const mockClimbQueueItem: ClimbQueueItem = {
  climb: mockClimb,
  addedBy: 'user-1',
  uuid: 'queue-item-1',
  suggested: false
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
  settername: '',
  setternameSuggestion: '',
  holdsFilter: {},
  hideAttempted: false,
  hideCompleted: false,
  showOnlyAttempted: false,
  showOnlyCompleted: false,
  circuitUuids: []
};

const initialState: QueueState = {
  queue: [],
  currentClimbQueueItem: null,
  climbSearchParams: mockSearchParams,
  hasDoneFirstFetch: false,
  initialQueueDataReceivedFromPeers: false
};

describe('queueReducer', () => {
  describe('ADD_TO_QUEUE', () => {
    it('should add a climb to an empty queue', () => {
      const action: QueueAction = {
        type: 'ADD_TO_QUEUE',
        payload: mockClimbQueueItem
      };

      const result = queueReducer(initialState, action);

      expect(result.queue).toHaveLength(1);
      expect(result.queue[0]).toEqual(mockClimbQueueItem);
      expect(result.currentClimbQueueItem).toBeNull();
    });

    it('should add a climb to an existing queue', () => {
      const existingItem: ClimbQueueItem = {
        ...mockClimbQueueItem,
        uuid: 'existing-item'
      };
      
      const stateWithQueue: QueueState = {
        ...initialState,
        queue: [existingItem]
      };

      const newItem: ClimbQueueItem = {
        ...mockClimbQueueItem,
        uuid: 'new-item'
      };

      const action: QueueAction = {
        type: 'ADD_TO_QUEUE',
        payload: newItem
      };

      const result = queueReducer(stateWithQueue, action);

      expect(result.queue).toHaveLength(2);
      expect(result.queue[0]).toEqual(existingItem);
      expect(result.queue[1]).toEqual(newItem);
    });
  });

  describe('REMOVE_FROM_QUEUE', () => {
    it('should remove items from queue', () => {
      const item1: ClimbQueueItem = { ...mockClimbQueueItem, uuid: 'item-1' };
      const item2: ClimbQueueItem = { ...mockClimbQueueItem, uuid: 'item-2' };
      const item3: ClimbQueueItem = { ...mockClimbQueueItem, uuid: 'item-3' };

      const stateWithQueue: QueueState = {
        ...initialState,
        queue: [item1, item2, item3]
      };

      const action: QueueAction = {
        type: 'REMOVE_FROM_QUEUE',
        payload: [item1, item3] // Remove item2
      };

      const result = queueReducer(stateWithQueue, action);

      expect(result.queue).toHaveLength(2);
      expect(result.queue).toEqual([item1, item3]);
    });

    it('should handle removing all items', () => {
      const stateWithQueue: QueueState = {
        ...initialState,
        queue: [mockClimbQueueItem]
      };

      const action: QueueAction = {
        type: 'REMOVE_FROM_QUEUE',
        payload: []
      };

      const result = queueReducer(stateWithQueue, action);

      expect(result.queue).toHaveLength(0);
    });
  });

  describe('SET_CURRENT_CLIMB', () => {
    it('should set current climb and add to empty queue', () => {
      const action: QueueAction = {
        type: 'SET_CURRENT_CLIMB',
        payload: mockClimbQueueItem
      };

      const result = queueReducer(initialState, action);

      expect(result.currentClimbQueueItem).toEqual(mockClimbQueueItem);
      expect(result.queue).toHaveLength(1);
      expect(result.queue[0]).toEqual(mockClimbQueueItem);
    });

    it('should insert climb after current position in queue', () => {
      const item1: ClimbQueueItem = { ...mockClimbQueueItem, uuid: 'item-1' };
      const item2: ClimbQueueItem = { ...mockClimbQueueItem, uuid: 'item-2' };
      const item3: ClimbQueueItem = { ...mockClimbQueueItem, uuid: 'item-3' };
      const newItem: ClimbQueueItem = { ...mockClimbQueueItem, uuid: 'new-item' };

      const stateWithCurrentClimb: QueueState = {
        ...initialState,
        queue: [item1, item2, item3],
        currentClimbQueueItem: item2
      };

      const action: QueueAction = {
        type: 'SET_CURRENT_CLIMB',
        payload: newItem
      };

      const result = queueReducer(stateWithCurrentClimb, action);

      expect(result.currentClimbQueueItem).toEqual(newItem);
      expect(result.queue).toHaveLength(4);
      expect(result.queue).toEqual([item1, item2, newItem, item3]);
    });

    it('should handle when current climb is not in queue', () => {
      const item1: ClimbQueueItem = { ...mockClimbQueueItem, uuid: 'item-1' };
      const currentItem: ClimbQueueItem = { ...mockClimbQueueItem, uuid: 'current-not-in-queue' };
      const newItem: ClimbQueueItem = { ...mockClimbQueueItem, uuid: 'new-item' };

      const stateWithCurrentClimb: QueueState = {
        ...initialState,
        queue: [item1],
        currentClimbQueueItem: currentItem
      };

      const action: QueueAction = {
        type: 'SET_CURRENT_CLIMB',
        payload: newItem
      };

      const result = queueReducer(stateWithCurrentClimb, action);

      expect(result.currentClimbQueueItem).toEqual(newItem);
      expect(result.queue).toHaveLength(2);
      expect(result.queue).toEqual([item1, newItem]);
    });
  });

  describe('SET_CURRENT_CLIMB_QUEUE_ITEM', () => {
    it('should set current climb queue item without modifying queue', () => {
      const existingItem: ClimbQueueItem = { ...mockClimbQueueItem, uuid: 'existing' };
      const stateWithQueue: QueueState = {
        ...initialState,
        queue: [existingItem]
      };

      const action: QueueAction = {
        type: 'SET_CURRENT_CLIMB_QUEUE_ITEM',
        payload: existingItem
      };

      const result = queueReducer(stateWithQueue, action);

      expect(result.currentClimbQueueItem).toEqual(existingItem);
      expect(result.queue).toEqual([existingItem]);
    });

    it('should add suggested item to queue if not present', () => {
      const existingItem: ClimbQueueItem = { ...mockClimbQueueItem, uuid: 'existing' };
      const suggestedItem: ClimbQueueItem = { 
        ...mockClimbQueueItem, 
        uuid: 'suggested',
        suggested: true
      };

      const stateWithQueue: QueueState = {
        ...initialState,
        queue: [existingItem]
      };

      const action: QueueAction = {
        type: 'SET_CURRENT_CLIMB_QUEUE_ITEM',
        payload: suggestedItem
      };

      const result = queueReducer(stateWithQueue, action);

      expect(result.currentClimbQueueItem).toEqual(suggestedItem);
      expect(result.queue).toHaveLength(2);
      expect(result.queue).toEqual([existingItem, suggestedItem]);
    });

    it('should not add suggested item if already in queue', () => {
      const suggestedItem: ClimbQueueItem = { 
        ...mockClimbQueueItem, 
        uuid: 'suggested',
        suggested: true
      };

      const stateWithQueue: QueueState = {
        ...initialState,
        queue: [suggestedItem]
      };

      const action: QueueAction = {
        type: 'SET_CURRENT_CLIMB_QUEUE_ITEM',
        payload: suggestedItem
      };

      const result = queueReducer(stateWithQueue, action);

      expect(result.currentClimbQueueItem).toEqual(suggestedItem);
      expect(result.queue).toHaveLength(1);
      expect(result.queue).toEqual([suggestedItem]);
    });
  });

  describe('SET_CLIMB_SEARCH_PARAMS', () => {
    it('should update climb search params', () => {
      const newParams: SearchRequestPagination = {
        page: 2,
        pageSize: 10,
        gradeAccuracy: 1,
        maxGrade: 18,
        minAscents: 1,
        minGrade: 1,
        minRating: 1,
        sortBy: 'difficulty',
        sortOrder: 'asc',
        name: '',
        onlyClassics: false,
        settername: '',
        setternameSuggestion: '',
        holdsFilter: {},
        hideAttempted: false,
        hideCompleted: false,
        showOnlyAttempted: false,
        showOnlyCompleted: false,
        circuitUuids: []
      };

      const action: QueueAction = {
        type: 'SET_CLIMB_SEARCH_PARAMS',
        payload: newParams
      };

      const result = queueReducer(initialState, action);

      expect(result.climbSearchParams).toEqual(newParams);
      expect(result.queue).toEqual(initialState.queue);
      expect(result.currentClimbQueueItem).toEqual(initialState.currentClimbQueueItem);
    });
  });

  describe('UPDATE_QUEUE', () => {
    it('should update queue and current climb', () => {
      const newQueue = [mockClimbQueueItem];
      const newCurrentClimb = mockClimbQueueItem;

      const action: QueueAction = {
        type: 'UPDATE_QUEUE',
        payload: {
          queue: newQueue,
          currentClimbQueueItem: newCurrentClimb
        }
      };

      const result = queueReducer(initialState, action);

      expect(result.queue).toEqual(newQueue);
      expect(result.currentClimbQueueItem).toEqual(newCurrentClimb);
    });

    it('should preserve current climb when not provided', () => {
      const existingCurrentClimb = mockClimbQueueItem;
      const stateWithCurrentClimb: QueueState = {
        ...initialState,
        currentClimbQueueItem: existingCurrentClimb
      };

      const newQueue = [{ ...mockClimbQueueItem, uuid: 'new-item' }];

      const action: QueueAction = {
        type: 'UPDATE_QUEUE',
        payload: {
          queue: newQueue
        }
      };

      const result = queueReducer(stateWithCurrentClimb, action);

      expect(result.queue).toEqual(newQueue);
      expect(result.currentClimbQueueItem).toEqual(existingCurrentClimb);
    });
  });

  describe('INITIAL_QUEUE_DATA', () => {
    it('should set initial queue data and mark as received from peers', () => {
      const newQueue = [mockClimbQueueItem];
      const newCurrentClimb = mockClimbQueueItem;

      const action: QueueAction = {
        type: 'INITIAL_QUEUE_DATA',
        payload: {
          queue: newQueue,
          currentClimbQueueItem: newCurrentClimb
        }
      };

      const result = queueReducer(initialState, action);

      expect(result.queue).toEqual(newQueue);
      expect(result.currentClimbQueueItem).toEqual(newCurrentClimb);
      expect(result.initialQueueDataReceivedFromPeers).toBe(true);
    });
  });

  describe('SET_FIRST_FETCH', () => {
    it('should set hasDoneFirstFetch to true', () => {
      const action: QueueAction = {
        type: 'SET_FIRST_FETCH',
        payload: true
      };

      const result = queueReducer(initialState, action);

      expect(result.hasDoneFirstFetch).toBe(true);
    });

    it('should set hasDoneFirstFetch to false', () => {
      const stateWithFirstFetch: QueueState = {
        ...initialState,
        hasDoneFirstFetch: true
      };

      const action: QueueAction = {
        type: 'SET_FIRST_FETCH',
        payload: false
      };

      const result = queueReducer(stateWithFirstFetch, action);

      expect(result.hasDoneFirstFetch).toBe(false);
    });
  });

  describe('MIRROR_CLIMB', () => {
    it('should toggle mirrored state of current climb', () => {
      const currentClimb: ClimbQueueItem = {
        ...mockClimbQueueItem,
        climb: { ...mockClimb, mirrored: false }
      };

      const stateWithCurrentClimb: QueueState = {
        ...initialState,
        currentClimbQueueItem: currentClimb
      };

      const action: QueueAction = {
        type: 'MIRROR_CLIMB'
      };

      const result = queueReducer(stateWithCurrentClimb, action);

      expect(result.currentClimbQueueItem?.climb.mirrored).toBe(true);
    });

    it('should toggle mirrored state from true to false', () => {
      const currentClimb: ClimbQueueItem = {
        ...mockClimbQueueItem,
        climb: { ...mockClimb, mirrored: true }
      };

      const stateWithCurrentClimb: QueueState = {
        ...initialState,
        currentClimbQueueItem: currentClimb
      };

      const action: QueueAction = {
        type: 'MIRROR_CLIMB'
      };

      const result = queueReducer(stateWithCurrentClimb, action);

      expect(result.currentClimbQueueItem?.climb.mirrored).toBe(false);
    });

    it('should do nothing when no current climb', () => {
      const action: QueueAction = {
        type: 'MIRROR_CLIMB'
      };

      const result = queueReducer(initialState, action);

      expect(result).toEqual(initialState);
    });
  });

  describe('default case', () => {
    it('should return unchanged state for unknown action', () => {
      const unknownAction = { type: 'UNKNOWN_ACTION' } as unknown as QueueAction;

      const result = queueReducer(initialState, unknownAction);

      expect(result).toEqual(initialState);
    });
  });
});