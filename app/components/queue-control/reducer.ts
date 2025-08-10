import { useReducer } from 'react';
import { QueueState, QueueAction } from './types';
import { SearchRequestPagination } from '@/app/lib/types';

const initialState = (initialSearchParams: SearchRequestPagination): QueueState => ({
  queue: [],
  currentClimbQueueItem: null,
  climbSearchParams: initialSearchParams,
  hasDoneFirstFetch: false,
  initialQueueDataReceivedFromPeers: false,
});

export function queueReducer(state: QueueState, action: QueueAction): QueueState {
  switch (action.type) {
    case 'SET_CURRENT_CLIMB':
      const currentIndex = state.currentClimbQueueItem
        ? state.queue.findIndex(({ uuid }) => uuid === state.currentClimbQueueItem?.uuid)
        : -1;

      return {
        ...state,
        currentClimbQueueItem: action.payload,
        queue:
          currentIndex === -1
            ? [...state.queue, action.payload]
            : [...state.queue.slice(0, currentIndex + 1), action.payload, ...state.queue.slice(currentIndex + 1)],
      };

    case 'SET_CURRENT_CLIMB_QUEUE_ITEM':
      return {
        ...state,
        currentClimbQueueItem: action.payload,
        queue:
          action.payload.suggested && !state.queue.find(({ uuid }) => uuid === action.payload.uuid)
            ? [...state.queue, action.payload]
            : state.queue,
      };

    case 'SET_CLIMB_SEARCH_PARAMS':
      return {
        ...state,
        climbSearchParams: action.payload,
      };
    case 'INITIAL_QUEUE_DATA':
      return {
        ...state,
        queue: action.payload.queue,
        currentClimbQueueItem: action.payload.currentClimbQueueItem ?? state.currentClimbQueueItem,
        initialQueueDataReceivedFromPeers: true,
      };

    case 'UPDATE_QUEUE':
      return {
        ...state,
        queue: action.payload.queue,
        currentClimbQueueItem: action.payload.currentClimbQueueItem ?? state.currentClimbQueueItem,
      };

    case 'ADD_TO_QUEUE':
      return {
        ...state,
        queue: [...state.queue, action.payload],
      };

    case 'REMOVE_FROM_QUEUE':
      return {
        ...state,
        queue: [...action.payload],
      };

    case 'SET_FIRST_FETCH':
      return {
        ...state,
        hasDoneFirstFetch: action.payload,
      };

    case 'MIRROR_CLIMB':
      if (!state.currentClimbQueueItem) return state;
      return {
        ...state,
        currentClimbQueueItem: {
          ...state.currentClimbQueueItem,
          climb: {
            ...state.currentClimbQueueItem.climb,
            mirrored: !state.currentClimbQueueItem.climb.mirrored,
          },
        },
      };

    // Delta-specific reducers
    case 'DELTA_ADD_QUEUE_ITEM': {
      const { item, position } = action.payload;
      const newQueue = [...state.queue];
      
      if (position !== undefined && position >= 0 && position <= newQueue.length) {
        newQueue.splice(position, 0, item);
      } else {
        newQueue.push(item);
      }
      
      return {
        ...state,
        queue: newQueue,
      };
    }

    case 'DELTA_REMOVE_QUEUE_ITEM': {
      const { uuid } = action.payload;
      return {
        ...state,
        queue: state.queue.filter(item => item.uuid !== uuid),
        // Clear current climb if it was removed
        currentClimbQueueItem: state.currentClimbQueueItem?.uuid === uuid ? null : state.currentClimbQueueItem,
      };
    }

    case 'DELTA_REORDER_QUEUE_ITEM': {
      const { uuid, oldIndex, newIndex } = action.payload;
      const newQueue = [...state.queue];
      
      // Validate indices
      if (oldIndex < 0 || oldIndex >= newQueue.length || newIndex < 0 || newIndex >= newQueue.length) {
        return state;
      }
      
      // Verify the item at oldIndex has the expected UUID
      if (newQueue[oldIndex].uuid !== uuid) {
        return state;
      }
      
      // Perform the reorder
      const [movedItem] = newQueue.splice(oldIndex, 1);
      newQueue.splice(newIndex, 0, movedItem);
      
      return {
        ...state,
        queue: newQueue,
      };
    }

    case 'DELTA_UPDATE_CURRENT_CLIMB': {
      const { item, shouldAddToQueue } = action.payload;
      let newQueue = state.queue;
      
      // Add to queue if requested and item doesn't exist
      if (item && shouldAddToQueue && !state.queue.find(qItem => qItem.uuid === item.uuid)) {
        newQueue = [...state.queue, item];
      }
      
      return {
        ...state,
        queue: newQueue,
        currentClimbQueueItem: item,
      };
    }

    case 'DELTA_MIRROR_CURRENT_CLIMB': {
      const { mirrored } = action.payload;
      if (!state.currentClimbQueueItem) return state;
      
      const updatedCurrentItem = {
        ...state.currentClimbQueueItem,
        climb: {
          ...state.currentClimbQueueItem.climb,
          mirrored,
        },
      };
      
      // Update the item in the queue as well if it exists
      const updatedQueue = state.queue.map(item => 
        item.uuid === state.currentClimbQueueItem?.uuid ? updatedCurrentItem : item
      );
      
      return {
        ...state,
        queue: updatedQueue,
        currentClimbQueueItem: updatedCurrentItem,
      };
    }

    case 'DELTA_REPLACE_QUEUE_ITEM': {
      const { uuid, item } = action.payload;
      const itemIndex = state.queue.findIndex(qItem => qItem.uuid === uuid);
      
      if (itemIndex === -1) {
        return state;
      }
      
      const newQueue = [...state.queue];
      newQueue[itemIndex] = item;
      
      return {
        ...state,
        queue: newQueue,
        // Update current climb if it was the replaced item
        currentClimbQueueItem: state.currentClimbQueueItem?.uuid === uuid ? item : state.currentClimbQueueItem,
      };
    }

    default:
      return state;
  }
}

export const useQueueReducer = (initialSearchParams: SearchRequestPagination) => {
  return useReducer(queueReducer, initialState(initialSearchParams));
};
