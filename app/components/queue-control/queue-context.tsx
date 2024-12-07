// File: QueueContext.tsx
'use client';

import React, { useContext, createContext, ReactNode, useEffect, useCallback } from 'react';
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
  const { sendData, peerId, subscribeToData, hostId } = usePeerContext();

  // Set up queue update handler
  const handlePeerData = useCallback(
    (data: PeerData) => {
      console.log(`${new Date().getTime()} Queue context received: ${data.type} from: ${data.source}`);

      switch (data.type) {
        case 'new-connection':
          sendData(
            {
              type: 'initial-queue-data',
              queue: state.queue,
              currentClimbQueueItem: state.currentClimbQueueItem,
            },
            data.source,
          );
          break;
        case 'initial-queue-data':
          if (hostId !== data.source) {
            console.log(`Ignoring queue data from ${data.source} since it's not the host.`);
            return;
          }
          dispatch({
            type: 'INITIAL_QUEUE_DATA',
            payload: {
              queue: data.queue,
              currentClimbQueueItem: data.currentClimbQueueItem || null,
            },
          });
          break;
        case 'update-queue':
          dispatch({
            type: 'UPDATE_QUEUE',
            payload: {
              queue: data.queue,
              currentClimbQueueItem: data.currentClimbQueueItem || null,
            },
          });
          break;
      }
    },
    [sendData, state.queue, state.currentClimbQueueItem, hostId, dispatch],
  );

  useEffect(() => {
    const unsubscribe = subscribeToData(handlePeerData);
    return () => unsubscribe();
  }, [subscribeToData, handlePeerData]);

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
    hasDoneFirstFetch: state.hasDoneFirstFetch,
    setHasDoneFirstFetch: () => dispatch({ type: 'SET_FIRST_FETCH', payload: true }),
  });

  const contextValue: QueueContextType = {
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
    viewOnlyMode: hostId ? !state.initialQueueDataReceivedFromPeers : false,
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
      /**
       * The behaviour of setCurrentClimb is subtly different from setCurrentClimbQueueItem
       * But I cant quite remember how, I think something about inserting the current lcimb at the current position
       * in the queue.
       */
      const newItem = createClimbQueueItem(climb, peerId);

      dispatch({ type: 'SET_CURRENT_CLIMB', payload: newItem });

      /**
       * THe queue injecting logic is completely duplicated in the reducer, so should figure out how to reuse
       * that somehow. Probably by having a middleware perform sideeffects, or something like that.
       */
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
    setQueue: (queue) => {
      dispatch({ type: 'UPDATE_QUEUE', payload: {
        queue,
        currentClimbQueueItem: state.currentClimbQueueItem
      } });
      
      sendData({
        type: 'update-queue',
        queue,
        currentClimbQueueItem: state.currentClimbQueueItem
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

    mirrorClimb: () => {
      if (!state.currentClimbQueueItem?.climb) {
        return;
      }
      dispatch({ type: 'MIRROR_CLIMB' });

      sendData({
        type: 'update-queue',
        queue: state.queue,
        currentClimbQueueItem: {
          ...state.currentClimbQueueItem,
          climb: {
            ...state.currentClimbQueueItem?.climb,
            mirrored: !state.currentClimbQueueItem?.climb.mirrored,
          },
        },
      });
    },

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
