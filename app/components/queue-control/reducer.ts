import { useReducer } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { QueueState, QueueAction } from './types';
import { SearchRequestPagination } from '@/app/lib/types';

const initialState = (initialSearchParams: SearchRequestPagination): QueueState => ({
  queue: [],
  currentClimbQueueItem: null,
  climbSearchParams: initialSearchParams,
  hasDoneFirstFetch: false,
});

export function queueReducer(state: QueueState, action: QueueAction): QueueState {
  switch (action.type) {
    // ... previous cases

    case 'SET_CURRENT_CLIMB':
      const newItem = {
        climb: action.payload,
        uuid: uuidv4(),
      };
      const currentIndex = state.currentClimbQueueItem
        ? state.queue.findIndex(({ uuid }) => uuid === state.currentClimbQueueItem?.uuid)
        : -1;

      return {
        ...state,
        currentClimbQueueItem: newItem,
        queue:
          currentIndex === -1
            ? [...state.queue, newItem]
            : [...state.queue.slice(0, currentIndex + 1), newItem, ...state.queue.slice(currentIndex + 1)],
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

    case 'UPDATE_QUEUE':
      return {
        ...state,
        queue: action.payload.queue,
        currentClimbQueueItem: action.payload.currentClimbQueueItem ?? state.currentClimbQueueItem,
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

    default:
      return state;
  }
}

export const useQueueReducer = (initialSearchParams: SearchRequestPagination) => {
  return useReducer(queueReducer, initialState(initialSearchParams));
};
