// File: QueueContext.tsx
'use client';

import React, { useContext, createContext, ReactNode, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { usePeerContext } from '../connection-manager/peer-context';
import { useQueueReducer } from './reducer';
import { useQueueDataFetching } from './hooks/use-queue-data-fetching';
import { useControllerWebSocket } from './hooks/use-controller-websocket';
import { QueueContextType, ClimbQueueItem, UserName } from './types';
import { urlParamsToSearchParams, searchParamsToUrlParams } from '@/app/lib/url-utils';
import { Climb, ParsedBoardRouteParameters } from '@/app/lib/types';
import { ReceivedPeerData } from '../connection-manager/types';

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
  const router = useRouter();
  const initialSearchParams = urlParamsToSearchParams(searchParams);
  const [state, dispatch] = useQueueReducer(initialSearchParams);
  const peerContext = usePeerContext();
  const controllerWS = useControllerWebSocket();
  
  // Use controller WebSocket if available, otherwise fall back to PeerJS
  const isControllerMode = controllerWS.isControllerMode && controllerWS.isConnected;
  const sendData = isControllerMode ? controllerWS.sendData : peerContext.sendData;
  const peerId = isControllerMode ? 'boardsesh-client' : peerContext.peerId;
  const hostId = isControllerMode ? controllerWS.controllerId : peerContext.hostId;
  const subscribeToData = isControllerMode ? controllerWS.subscribeToData : peerContext.subscribeToData;

  // Set up queue update handler
  const handlePeerData = useCallback(
    (data: ReceivedPeerData) => {
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
            console.log(`Ignoring queue data from ${data.source} since it's not the host(${hostId}).`);
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
        case 'add-queue-item':
          dispatch({
            type: 'DELTA_ADD_QUEUE_ITEM',
            payload: {
              item: data.item,
              position: data.position,
            },
          });
          break;
        case 'remove-queue-item':
          dispatch({
            type: 'DELTA_REMOVE_QUEUE_ITEM',
            payload: {
              uuid: data.uuid,
            },
          });
          break;
        case 'reorder-queue-item':
          dispatch({
            type: 'DELTA_REORDER_QUEUE_ITEM',
            payload: {
              uuid: data.uuid,
              oldIndex: data.oldIndex,
              newIndex: data.newIndex,
            },
          });
          break;
        case 'update-current-climb':
          dispatch({
            type: 'DELTA_UPDATE_CURRENT_CLIMB',
            payload: {
              item: data.item,
              shouldAddToQueue: data.shouldAddToQueue,
            },
          });
          break;
        case 'mirror-current-climb':
          dispatch({
            type: 'DELTA_MIRROR_CURRENT_CLIMB',
            payload: {
              mirrored: data.mirrored,
            },
          });
          break;
        case 'replace-queue-item':
          dispatch({
            type: 'DELTA_REPLACE_QUEUE_ITEM',
            payload: {
              uuid: data.uuid,
              item: data.item,
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

  // Add this to ensure we get logbook entries even when there are no search results

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
    viewOnlyMode: isControllerMode ? false : (hostId ? !state.initialQueueDataReceivedFromPeers : false),
    // Actions
    addToQueue: (climb: Climb) => {
      const newItem = createClimbQueueItem(climb, peerId);

      dispatch({ type: 'DELTA_ADD_QUEUE_ITEM', payload: { item: newItem } });
      sendData({
        type: 'add-queue-item',
        item: newItem,
      });
    },

    removeFromQueue: (item: ClimbQueueItem) => {
      dispatch({ type: 'DELTA_REMOVE_QUEUE_ITEM', payload: { uuid: item.uuid } });
      sendData({
        type: 'remove-queue-item',
        uuid: item.uuid,
      });
    },

    setCurrentClimb: (climb: Climb) => {
      const newItem = createClimbQueueItem(climb, peerId);

      dispatch({ type: 'SET_CURRENT_CLIMB', payload: newItem });

      // Send delta message to add the item at the appropriate position
      const currentIndex = state.currentClimbQueueItem
        ? state.queue.findIndex(({ uuid }) => uuid === state.currentClimbQueueItem?.uuid)
        : -1;
      const position = currentIndex === -1 ? undefined : currentIndex + 1;

      sendData({
        type: 'add-queue-item',
        item: newItem,
        position,
      });

      // Then update the current climb
      sendData({
        type: 'update-current-climb',
        item: newItem,
        shouldAddToQueue: false, // Already added above
      });
    },
    setQueue: (queue) => {
      // For now, keep the full update for complex reordering operations
      // TODO: Implement delta-based reordering for better efficiency
      dispatch({
        type: 'UPDATE_QUEUE',
        payload: {
          queue,
          currentClimbQueueItem: state.currentClimbQueueItem,
        },
      });

      sendData({
        type: 'update-queue',
        queue,
        currentClimbQueueItem: state.currentClimbQueueItem,
      });
    },
    setCurrentClimbQueueItem: (item: ClimbQueueItem) => {
      dispatch({ type: 'DELTA_UPDATE_CURRENT_CLIMB', payload: { item, shouldAddToQueue: item.suggested } });
      
      sendData({
        type: 'update-current-climb',
        item,
        shouldAddToQueue: item.suggested,
      });
    },

    setClimbSearchParams: (params) => {
      dispatch({ type: 'SET_CLIMB_SEARCH_PARAMS', payload: params });

      // Update URL with new search parameters
      const urlParams = searchParamsToUrlParams(params);
      const currentPath = window.location.pathname;
      router.replace(`${currentPath}?${urlParams.toString()}`);
    },

    mirrorClimb: () => {
      if (!state.currentClimbQueueItem?.climb) {
        return;
      }
      const newMirroredState = !state.currentClimbQueueItem.climb?.mirrored;
      
      dispatch({ type: 'DELTA_MIRROR_CURRENT_CLIMB', payload: { mirrored: newMirroredState } });

      sendData({
        type: 'mirror-current-climb',
        mirrored: newMirroredState,
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
