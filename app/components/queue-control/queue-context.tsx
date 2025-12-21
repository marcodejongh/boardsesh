// File: QueueContext.tsx
'use client';

import React, { useContext, createContext, ReactNode, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { useConnection } from '../connection-manager/use-connection';
import { useQueueReducer } from './reducer';
import { useQueueDataFetching } from './hooks/use-queue-data-fetching';
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
  const pathname = usePathname();
  const initialSearchParams = urlParamsToSearchParams(searchParams);
  const [state, dispatch] = useQueueReducer(initialSearchParams);
  const connection = useConnection();

  // Check if we're in controller mode
  const controllerUrl = searchParams.get('controllerUrl');
  const isControllerMode = !!controllerUrl;
  
  // Use the connection hook which handles the switching logic
  const sendData = connection.sendData;
  const peerId = connection.peerId;
  const hostId = connection.hostId;
  const subscribeToData = connection.subscribeToData;
  const requestQueueState = connection.requestQueueState;

  // Track if we've already requested initial queue state
  const hasRequestedQueueState = useRef(false);
  // Track if we've received initial data to prevent replaying on re-subscription
  const hasReceivedInitialData = useRef(false);

  // Use refs for values needed in handler to avoid re-subscription on state changes
  const stateRef = useRef({ queue: state.queue, currentClimbQueueItem: state.currentClimbQueueItem });
  stateRef.current = { queue: state.queue, currentClimbQueueItem: state.currentClimbQueueItem };

  const hostIdRef = useRef(hostId);
  hostIdRef.current = hostId;

  // Set up queue update handler - use refs to avoid dependency changes
  const handlePeerData = useCallback(
    (data: ReceivedPeerData) => {
      switch (data.type) {
        case 'new-connection':
          sendData(
            {
              type: 'initial-queue-data',
              queue: stateRef.current.queue,
              currentClimbQueueItem: stateRef.current.currentClimbQueueItem,
            },
            data.source,
          );
          break;
        case 'initial-queue-data':
          // Only accept initial data once to prevent replaying old state on re-subscription
          if (hasReceivedInitialData.current) {
            console.log('[DEBUG] Ignoring initial-queue-data, already received initial data');
            return;
          }
          // Accept data from the host OR from the daemon (which is authoritative in daemon mode)
          if (hostIdRef.current !== data.source && data.source !== 'daemon') {
            console.log(`Ignoring queue data from ${data.source} since it's not the host(${hostIdRef.current}) or daemon.`);
            return;
          }
          hasReceivedInitialData.current = true;
          console.log('[DEBUG] Processing initial-queue-data, queue length:', data.queue?.length);
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
    [sendData, dispatch], // Stable dependencies only
  );

  // Subscribe once on mount - handler uses refs so it's stable
  useEffect(() => {
    const unsubscribe = subscribeToData(handlePeerData);
    return () => unsubscribe();
  }, [subscribeToData, handlePeerData]);

  // Request initial queue state once when requestQueueState becomes available
  useEffect(() => {
    if (requestQueueState && !hasRequestedQueueState.current) {
      console.log('[DEBUG] QueueProvider requesting initial queue state');
      hasRequestedQueueState.current = true;
      requestQueueState();
    }
  }, [requestQueueState]);

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
    parsedParams,
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
      const queryString = urlParams.toString();
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
      router.replace(newUrl, { scroll: false });
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
