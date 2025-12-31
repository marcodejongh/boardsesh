import { useReducer } from 'react';
import { QueueState, QueueAction } from './types';
import { SearchRequestPagination } from '@/app/lib/types';

const initialState = (initialSearchParams: SearchRequestPagination): QueueState => ({
  queue: [],
  currentClimbQueueItem: null,
  climbSearchParams: initialSearchParams,
  hasDoneFirstFetch: false,
  initialQueueDataReceivedFromPeers: false,
  pendingCurrentClimbUpdates: [],
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
        // Clear pending updates on full sync since we're getting complete server state
        pendingCurrentClimbUpdates: [],
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

      // Skip if item already exists (prevents duplicate from optimistic update + subscription)
      if (state.queue.some(qItem => qItem.uuid === item.uuid)) {
        return state;
      }

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
      const { item, shouldAddToQueue, isServerEvent, eventClientId, myClientId } = action.payload;

      // Filter out stale entries (older than 5 seconds) before processing
      const now = Date.now();
      const freshPending = state.pendingCurrentClimbUpdates.filter(
        p => now - p.addedAt <= 5000
      );

      // For server events, check if this is an echo of our own update
      if (isServerEvent && item) {
        // Primary echo detection: check if event came from our own client
        const isOurOwnEcho = eventClientId && myClientId && eventClientId === myClientId;

        if (isOurOwnEcho) {
          // This is our own update echoed back - skip it and remove from pending
          return {
            ...state,
            pendingCurrentClimbUpdates: freshPending.filter(p => p.uuid !== item.uuid),
          };
        }

        // Fallback: check pending list (for backward compatibility or if clientIds unavailable)
        const isPending = freshPending.find(p => p.uuid === item.uuid);
        if (isPending && !eventClientId) {
          // No clientId available, use pending list as fallback
          return {
            ...state,
            pendingCurrentClimbUpdates: freshPending.filter(p => p.uuid !== item.uuid),
          };
        }
      }

      // Skip if this is the same item (deduplication for optimistic updates)
      if (item && state.currentClimbQueueItem?.uuid === item.uuid) {
        return state;
      }

      let newQueue = state.queue;
      let newPendingUpdates = freshPending;

      // Add to queue if requested and item doesn't exist
      if (item && shouldAddToQueue && !state.queue.find(qItem => qItem.uuid === item.uuid)) {
        newQueue = [...state.queue, item];
      }

      // For local updates (not server events), track as pending with timestamp
      if (!isServerEvent && item) {
        // Add to pending list with timestamp, keeping only last 50 to prevent unbounded growth
        newPendingUpdates = [
          ...freshPending,
          { uuid: item.uuid, addedAt: Date.now() }
        ].slice(-50);
      }

      return {
        ...state,
        queue: newQueue,
        currentClimbQueueItem: item,
        pendingCurrentClimbUpdates: newPendingUpdates,
      };
    }

    case 'CLEANUP_PENDING_UPDATE': {
      return {
        ...state,
        pendingCurrentClimbUpdates: state.pendingCurrentClimbUpdates.filter(
          p => p.uuid !== action.payload.uuid
        ),
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
