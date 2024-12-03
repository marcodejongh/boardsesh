'use client';

import React, { useCallback, useEffect, useRef, useReducer } from 'react';
import { createContext, useContext, ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import useSWRInfinite from 'swr/infinite';
import { v4 as uuidv4 } from 'uuid';
import Peer, { DataConnection } from 'peerjs';

import { Climb, ParsedBoardRouteParameters, SearchRequestPagination } from '@/app/lib/types';
import { constructClimbSearchUrl, searchParamsToUrlParams, urlParamsToSearchParams } from '@/app/lib/url-utils';
import { PAGE_LIMIT } from '../board-page/constants';
import { PeerConnectionState, PeerData } from '../connection-manager/types';

// Types
type QueueContextProps = {
  parsedParams: ParsedBoardRouteParameters;
  children: ReactNode;
};

type UserName = string;
type PeerId = string | null;

export type ClimbQueueItem = {
  addedBy?: UserName;
  tickedBy?: UserName[];
  climb: Climb;
  uuid: string;
  suggested?: boolean;
};

type ClimbQueue = ClimbQueueItem[];

// State interface
interface QueueState {
  queue: ClimbQueue;
  currentClimbQueueItem: ClimbQueueItem | null;
  climbSearchParams: SearchRequestPagination;
  peer: Peer | null;
  peerId: PeerId;
  connections: PeerConnectionState;
  readyToConnect: boolean;
  hasDoneFirstFetch: boolean;
}

// Action types
type QueueAction =
  | { type: 'ADD_TO_QUEUE'; payload: Climb }
  | { type: 'REMOVE_FROM_QUEUE'; payload: ClimbQueueItem }
  | { type: 'SET_CURRENT_CLIMB'; payload: Climb }
  | { type: 'SET_CURRENT_CLIMB_QUEUE_ITEM'; payload: ClimbQueueItem }
  | { type: 'SET_CLIMB_SEARCH_PARAMS'; payload: SearchRequestPagination }
  | { type: 'UPDATE_QUEUE'; payload: { queue: ClimbQueue; currentClimbQueueItem?: ClimbQueueItem | null } }
  | { type: 'SET_PEER'; payload: Peer }
  | { type: 'SET_PEER_ID'; payload: string }
  | { type: 'SET_READY_TO_CONNECT'; payload: boolean }
  | { type: 'UPDATE_CONNECTIONS'; payload: PeerConnectionState }
  | { type: 'SET_FIRST_FETCH'; payload: boolean }
  | { type: 'MIRROR_CLIMB' };

// Reducer
function queueReducer(state: QueueState, action: QueueAction): QueueState {
  switch (action.type) {
    case 'ADD_TO_QUEUE':
      const newQueueItem = {
        climb: action.payload,
        addedBy: state.peerId,
        uuid: uuidv4(),
      };
      return {
        ...state,
        queue: [...state.queue, newQueueItem],
      };

    case 'REMOVE_FROM_QUEUE':
      return {
        ...state,
        queue: state.queue.filter((item) => item.uuid !== action.payload.uuid),
      };

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

    case 'UPDATE_QUEUE':
      return {
        ...state,
        queue: action.payload.queue,
        currentClimbQueueItem: action.payload.currentClimbQueueItem ?? state.currentClimbQueueItem,
      };

    case 'SET_CLIMB_SEARCH_PARAMS':
      return {
        ...state,
        climbSearchParams: action.payload,
      };

    case 'SET_PEER':
      return {
        ...state,
        peer: action.payload,
      };

    case 'SET_PEER_ID':
      return {
        ...state,
        peerId: action.payload,
      };

    case 'SET_READY_TO_CONNECT':
      return {
        ...state,
        readyToConnect: action.payload,
      };

    case 'UPDATE_CONNECTIONS':
      return {
        ...state,
        connections: action.payload,
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

// Create a separate function for peer message handling
const sendData = (
  connections: DataConnection[],
  peerId: PeerId,
  data: PeerData,
  connectionId: string | null = null,
) => {
  if (!peerId) return;

  const message = { ...data, source: peerId, messageId: uuidv4() };

  if (connectionId) {
    const connection = connections.find((conn) => conn.peer === connectionId);
    if (connection) {
      connection.send(message);
    } else {
      console.error(`No active connection with ID ${connectionId}`);
    }
  } else {
    connections.forEach((conn) => conn.send(message));
  }
};

// Data fetching function
const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Context
const QueueContext = createContext<QueueContextType | undefined>(undefined);
let peerInstance: Peer | undefined;

export const QueueProvider = ({ parsedParams, children }: QueueContextProps) => {
  const searchParams = useSearchParams();
  const initialState: QueueState = {
    queue: [],
    currentClimbQueueItem: null,
    climbSearchParams: urlParamsToSearchParams(searchParams),
    peer: null,
    peerId: null,
    connections: [],
    readyToConnect: false,
    hasDoneFirstFetch: false,
  };

  const [state, dispatch] = useReducer(queueReducer, initialState);
  const receivedDataRef = useRef((data: PeerData) => {
    switch (data.type) {
      case 'request-update-queue':
        sendData(
          state.connections,
          state.peerId,
          {
            type: 'update-queue',
            queue: state.queue,
            currentClimbQueueItem: state.currentClimbQueueItem,
          },
          data.source,
        );
        break;
      case 'update-queue':
        dispatch({
          type: 'UPDATE_QUEUE',
          payload: {
            queue: data.queue,
            currentClimbQueueItem: data.currentClimbQueueItem,
          },
        });
        break;
    }
  });

  // SWR setup
  const getKey = (pageIndex: number, previousPageData: any) => {
    if (previousPageData && previousPageData.climbs.length === 0) return null;

    const queryString = searchParamsToUrlParams({
      ...state.climbSearchParams,
      page: pageIndex,
    }).toString();

    return constructClimbSearchUrl(parsedParams, queryString);
  };

  const {
    data,
    size,
    setSize,
    isLoading: isFetchingClimbs,
  } = useSWRInfinite(getKey, fetcher, {
    revalidateOnFocus: false,
    revalidateFirstPage: false,
    initialSize: state.climbSearchParams.page ? state.climbSearchParams.page + 1 : 1,
  });

  // Derived state
  const hasMoreResults = data && data[0] && size * PAGE_LIMIT < data[0].totalCount;
  const totalSearchResultCount = (data && data[0] && data[0].totalCount) || null;
  const climbSearchResults = data ? data.flatMap((page: { climbs: Climb[] }) => page.climbs) : null;
  const suggestedClimbs = (climbSearchResults || []).filter(
    (item) => !state.queue.find(({ climb: { uuid } }) => item.uuid === uuid),
  );

  // Effects and handlers
  useEffect(() => {
    if (!peerInstance) {
      peerInstance = new Peer({ debug: 1 });
      const p = peerInstance;

      p.on('open', (id: string) => {
        dispatch({ type: 'SET_PEER_ID', payload: id });
        dispatch({ type: 'SET_READY_TO_CONNECT', payload: true });
      });

      p.on('connection', (newConn: DataConnection) => {
        dispatch({
          type: 'UPDATE_CONNECTIONS',
          payload: [...state.connections, newConn],
        });
      });

      dispatch({ type: 'SET_PEER', payload: p });
    }

    return () => {
      if (state.peer) {
        state.peer.destroy();
      }
    };
  }, []);

  // Add connection handling effect
  useEffect(() => {
    // Iterate over connections whenever they change
    state.connections.forEach((conn) => {
      if (!conn.open) {
        conn.on('open', () => {
          console.log(`Connection opened with peer ${conn.peer}`);
        });
      }

      conn.on('data', (data: any) => {
        console.log('Received data:', data);
        receivedDataRef.current(data);
      });

      conn.on('close', () => {
        console.log(`Connection closed with peer ${conn.peer}`);
        dispatch({
          type: 'UPDATE_CONNECTIONS',
          payload: state.connections.filter((connection) => connection.peer !== conn.peer),
        });
      });

      conn.on('error', (err) => {
        console.error(`Error with peer ${conn.peer}:`, err);
      });
    });
  }, [state.connections]);

  // Add connection initialization effect
  const connectToPeer = useCallback(
    (connectionId: string) => {
      if (!state.peer) return;

      const newConn = state.peer.connect(connectionId);
      if (!newConn) return;

      dispatch({
        type: 'UPDATE_CONNECTIONS',
        payload: [...state.connections, newConn],
      });
    },
    [state.peer, state.connections],
  );

  // Add host connection effect
  const hostId = useSearchParams().get('hostId');

  useEffect(() => {
    // Attempt to connect when ready and hostId is available
    if (state.readyToConnect && hostId) {
      const connectionExists = state.connections.some((conn) => conn.peer === hostId);
      if (!connectionExists) {
        console.log('Attempting to connect to hostId:', hostId);
        connectToPeer(hostId);
      }
    }
  }, [state.readyToConnect, hostId, connectToPeer, state.connections]);

  // Request queue update when connection is established
  useEffect(() => {
    state.connections.forEach((conn) => {
      if (!conn.open && hostId) {
        conn.on('open', () => {
          console.log(`Connection opened with peer ${conn.peer}`);
          conn.send({ type: 'request-update-queue' });
        });
      }
    });
  }, [state.connections, hostId]);

  const fetchMoreClimbs = useCallback(() => {
    setSize((oldSize) => {
      const newParams = { ...state.climbSearchParams, page: oldSize + 1 };
      history.replaceState(null, '', `${window.location.pathname}?${searchParamsToUrlParams(newParams).toString()}`);
      return oldSize + 1;
    });
  }, [state.climbSearchParams, setSize]);

  // Context value
  const contextValue = {
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
    peerId: state.peerId,

    // Actions
    addToQueue: (climb: Climb) => {
      const newItem = { climb, addedBy: state.peerId, uuid: uuidv4() };
      dispatch({ type: 'ADD_TO_QUEUE', payload: climb });
      sendData(state.connections, state.peerId, {
        type: 'update-queue',
        queue: [...state.queue, newItem],
      });
    },
    removeFromQueue: (item: ClimbQueueItem) => {
      dispatch({ type: 'REMOVE_FROM_QUEUE', payload: item });
      const newQueue = state.queue.filter((qItem) => qItem.uuid !== item.uuid);
      sendData(state.connections, state.peerId, {
        type: 'update-queue',
        queue: newQueue,
      });
    },
    setCurrentClimb: (climb: Climb) => {
      if (!state.viewOnlyMode) {
        dispatch({ type: 'SET_CURRENT_CLIMB', payload: climb });
        // We'll need to calculate the new queue state here similar to the reducer
        const newItem = { climb, uuid: uuidv4() };
        const currentIndex = state.currentClimbQueueItem
          ? state.queue.findIndex(({ uuid }) => uuid === state.currentClimbQueueItem?.uuid)
          : -1;
        const newQueue =
          currentIndex === -1
            ? [...state.queue, newItem]
            : [...state.queue.slice(0, currentIndex + 1), newItem, ...state.queue.slice(currentIndex + 1)];
        sendData(state.connections, state.peerId, {
          type: 'update-queue',
          queue: newQueue,
          currentClimbQueueItem: newItem,
        });
      }
    },
    setCurrentClimbQueueItem: (item: ClimbQueueItem) => {
      if (!state.viewOnlyMode) {
        dispatch({ type: 'SET_CURRENT_CLIMB_QUEUE_ITEM', payload: item });
        const newQueue =
          item.suggested && !state.queue.find(({ uuid }) => uuid === item.uuid) ? [...state.queue, item] : state.queue;
        sendData(state.connections, state.peerId, {
          type: 'update-queue',
          queue: newQueue,
          currentClimbQueueItem: item,
        });
      }
    },
    setClimbSearchParams: (params: SearchRequestPagination) =>
      dispatch({ type: 'SET_CLIMB_SEARCH_PARAMS', payload: params }),
    mirrorClimb: () => dispatch({ type: 'MIRROR_CLIMB' }),
    fetchMoreClimbs,

    // Navigation helpers
    getNextClimbQueueItem: () => {
      const queueItemIndex = state.queue.findIndex(({ uuid }) => uuid === state.currentClimbQueueItem?.uuid);

      if ((state.queue.length === 0 || state.queue.length <= queueItemIndex + 1) && climbSearchResults?.length > 0) {
        const nextClimb = suggestedClimbs[0];
        return nextClimb
          ? {
              uuid: uuidv4(),
              climb: nextClimb,
              suggested: true,
            }
          : null;
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
