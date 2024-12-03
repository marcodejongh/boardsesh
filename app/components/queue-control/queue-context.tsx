// File: QueueContext.tsx
'use client';

import React, { useContext, createContext, ReactNode, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { usePeerContext } from '../connection-manager/peer-context';
import { useQueueReducer } from './reducer';
import { useQueueDataFetching } from './hooks/use-queue-data-fetching';
import { QueueContextType, ClimbQueueItem, UserName } from './types';
import { urlParamsToSearchParams } from '@/app/lib/url-utils';
import { Climb, ParsedBoardRouteParameters } from '@/app/lib/types';
import { PeerData } from '../connection-manager/types';

type QueueContextProps = {
  parsedParams: ParsedBoardRouteParameters;
  children: ReactNode;
};

const createClimbQueueItem = (climb: Climb, addedBy: UserName, suggested?: boolean) => ({
  climb,
  addedBy,
  uuid: uuidv4(),
  suggested: !!suggested,
});

const QueueContext = createContext<QueueContextType | undefined>(undefined);

export const QueueProvider = ({ parsedParams, children }: QueueContextProps) => {
  const searchParams = useSearchParams();
  const initialSearchParams = urlParamsToSearchParams(searchParams);
  const [state, dispatch] = useQueueReducer(initialSearchParams);
  const { sendData, peerId, connections, subscribeToData } = usePeerContext();

  // Set up queue update handler
  useEffect(() => {
    subscribeToData((data: PeerData) => {
      if (data.type === 'update-queue' && data.queue) {
        dispatch({
          type: 'UPDATE_QUEUE',
          payload: {
            queue: data.queue,
            currentClimbQueueItem: data.currentClimbQueueItem || null,
          },
        });
      }
    });
  }, [dispatch, subscribeToData]);

  // Request initial queue state when connecting as a client
  useEffect(() => {
    const hostId = searchParams.get('hostId');
    if (hostId && peerId) {
      sendData({ type: 'request-update-queue' }, hostId);
    }
  }, [connections, peerId, searchParams, sendData]);

  const {
    climbSearchResults,
    suggestedClimbs,
    totalSearchResultCount,
    hasMoreResults,
    isFetchingClimbs,
    fetchMoreClimbs,
  } = useQueueDataFetching({
    searchParams: state.climbSearchParams,
    queue: state.queue,
    parsedParams,
  });

  const contextValue: QueueContextType = {
    // State
    queue: state.queue,
    currentClimbQueueItem: state.currentClimbQueueItem,
    currentClimb: state.currentClimbQueueItem?.climb || null,
    climbSearchParams: state.climbSearchParams,
    climbSearchResults,
    suggestedClimbs,
    totalSearchResultCount,
    hasMoreResults,
    isFetchingClimbs,
    hasDoneFirstFetch: state.hasDoneFirstFetch,
    viewOnlyMode: false,
    peerId,

    // Actions
    addToQueue: (climb: Climb) => {
      const newItem = createClimbQueueItem(climb, peerId);

      dispatch({ type: 'ADD_TO_QUEUE', payload: newItem });
      sendData({
        type: 'update-queue',
        queue: [...state.queue, newItem],
        currentClimbQueueItem: state.currentClimbQueueItem,
      });
    },

    removeFromQueue: (item: ClimbQueueItem) => {
      // TODO: SInce we're dispatching the full new queue, it can lead to race conditions if
      // someone is hammering the UI. So ideally, we call sendData _after_ the state has been applied
      const newQueue = state.queue.filter((qItem) => qItem.uuid !== item.uuid);

      dispatch({ type: 'REMOVE_FROM_QUEUE', payload: newQueue });

      sendData({
        type: 'update-queue',
        queue: newQueue,
        currentClimbQueueItem: state.currentClimbQueueItem,
      });
    },

    setCurrentClimb: (climb: Climb) => {
      dispatch({ type: 'SET_CURRENT_CLIMB', payload: climb });
      const newItem = createClimbQueueItem(climb, peerId);
      const currentIndex = state.currentClimbQueueItem
        ? state.queue.findIndex(({ uuid }) => uuid === state.currentClimbQueueItem?.uuid)
        : -1;
      const newQueue =
        currentIndex === -1
          ? [...state.queue, newItem]
          : [...state.queue.slice(0, currentIndex + 1), newItem, ...state.queue.slice(currentIndex + 1)];

      sendData({
        type: 'update-queue',
        queue: newQueue,
        currentClimbQueueItem: newItem,
      });
    },

    setCurrentClimbQueueItem: (item: ClimbQueueItem) => {
      dispatch({ type: 'SET_CURRENT_CLIMB_QUEUE_ITEM', payload: item });
      const newQueue =
        item.suggested && !state.queue.find(({ uuid }) => uuid === item.uuid) ? [...state.queue, item] : state.queue;

      sendData({
        type: 'update-queue',
        queue: newQueue,
        currentClimbQueueItem: item,
      });
    },

    setClimbSearchParams: (params) => dispatch({ type: 'SET_CLIMB_SEARCH_PARAMS', payload: params }),

    mirrorClimb: () => dispatch({ type: 'MIRROR_CLIMB' }),

    fetchMoreClimbs,

    getNextClimbQueueItem: () => {
      const queueItemIndex = state.queue.findIndex(({ uuid }) => uuid === state.currentClimbQueueItem?.uuid);

      if (
        (state.queue.length === 0 || state.queue.length <= queueItemIndex + 1) &&
        climbSearchResults &&
        climbSearchResults?.length > 0
      ) {
        const nextClimb = suggestedClimbs[0];
        return nextClimb ? createClimbQueueItem(nextClimb, peerId, true) : null;
      }

      return queueItemIndex >= state.queue.length - 1 ? null : state.queue[queueItemIndex + 1];
    },

    getPreviousClimbQueueItem: () => {
      const queueItemIndex = state.queue.findIndex(({ uuid }) => uuid === state.currentClimbQueueItem?.uuid);
      return queueItemIndex > 0 ? state.queue[queueItemIndex - 1] : null;
    },
  };

  return <QueueContext.Provider value={contextValue}>{children}</QueueContext.Provider>;
};

export const useQueueContext = () => {
  const context = useContext(QueueContext);
  if (!context) {
    throw new Error('useQueueContext must be used within a QueueProvider');
  }
  return context;
};
