'use client';

import React, { useCallback, useEffect, useRef } from 'react';

import { Climb, ParsedBoardRouteParameters, SearchRequestPagination } from '@/app/lib/types';
import { constructClimbSearchUrl, searchParamsToUrlParams, urlParamsToSearchParams } from '@/app/lib/url-utils';
import { useSearchParams } from 'next/navigation';
import { createContext, useContext, useState, ReactNode } from 'react';
import useSWRInfinite from 'swr/infinite';
import { v4 as uuidv4 } from 'uuid';
import { PAGE_LIMIT } from '../board-page/constants';
import { PeerConnectionState, PeerData } from '../connection-manager/types';
import Peer, { DataConnection } from 'peerjs';

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

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type ClimbQueue = ClimbQueueItem[];

 const sendData = (connections: DataConnection[], peerId: PeerId, data: PeerData, connectionId: string | null = null) => {
    if(!peerId) {
      return;
    }

    console.log(`Sending `, data);
    const message = { ...data, source: peerId, messageId: uuidv4() };
    if (connectionId) {
      const connection = connections.find((conn) => conn.peer === connectionId);
      if (connection) {
        connection.send(message);
      } else {
        console.error(`No active connection with ID ${connectionId}`);
      }
    } else {
      // Broadcast to all connections
      connections.forEach((conn) => conn.send(message));
    }
  };

interface QueueContextType {
  queue: ClimbQueue;

  addToQueue: (climb: Climb) => void;
  removeFromQueue: (queueItem: ClimbQueueItem) => void;

  setCurrentClimb: (climb: Climb) => void;
  currentClimb: Climb | null;
  currentClimbQueueItem: ClimbQueueItem | null;

  setClimbSearchParams: (searchParams: SearchRequestPagination) => void;

  climbSearchParams: SearchRequestPagination;
  climbSearchResults: Climb[] | null;
  suggestedClimbs: Climb[];
  totalSearchResultCount: number | null;

  fetchMoreClimbs: () => void;

  setCurrentClimbQueueItem: (item: ClimbQueueItem) => void;

  getNextClimbQueueItem: () => ClimbQueueItem | null;
  getPreviousClimbQueueItem: () => ClimbQueueItem | null;
  mirrorClimb: (mirror: boolean) => void;
  
  hasMoreResults: boolean;
  isFetchingClimbs: boolean;
  hasDoneFirstFetch: boolean;
  viewOnlyMode: boolean;
}

const QueueContext = createContext<QueueContextType | undefined>(undefined);
let peerInstance: Peer | undefined;

export const useQueueContext = () => {
  const context = useContext(QueueContext);
  if (!context) {
    throw new Error('useQueueContext must be used within a QueueProvider');
  }
  return context;
};

export const QueueProvider = ({ parsedParams, children }: QueueContextProps) => {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [connections, setConnections] = useState<PeerConnectionState>([]);
  const [receivedData, setReceivedData] = useState<PeerData | null>(null);

  const [peerId, setPeerId] = useState<string | null>(null);
  const [readyToConnect, setReadyToConnect] = useState(false);
  const [queue, setQueueState] = useState<ClimbQueue>([]);
  const [hasDoneFirstFetch, setHasDoneFirstFetch] = useState<boolean>(false);

  const [currentClimbQueueItem, setCurrentClimbQueueItemState] = useState<ClimbQueueItem | null>(null);

  const [climbSearchParams, setClimbSearchParamsState] = useState<SearchRequestPagination>(
    urlParamsToSearchParams(useSearchParams()),
  );


  const receiveDataRef = useRef((data: PeerData) => {
    setReceivedData(data);
  });

  // Scrappy way to check if this browser is the host
  const hostId = useSearchParams().get('hostId');

  useEffect(() => {
    // Iterate over connections whenever they change
    connections.forEach((conn) => {
      if (!conn.open) {
        conn.on('open', () => {
          console.log(`Connection opened with peer ${conn.peer}`);
        });
      }

      conn.on('data', (data: any) => {
        console.log('Received data:', data);
        receiveDataRef.current(data);
      });

      conn.on('close', () => {
        console.log(`Connection closed with peer ${conn.peer}`);
        setConnections((prevConnections) => prevConnections.filter((connection) => connection.peer !== conn.peer));
      });

      conn.on('error', (err) => {
        console.error(`Error with peer ${conn.peer}:`, err);
      });
    });
  }, [connections]);

  useEffect(() => {
    if (!peerInstance) {
      peerInstance = new Peer({ debug: 1 });
      const p = peerInstance;

      p.on('open', (id: string) => {
        console.log('My peer ID is:', id);
        setPeerId(id);
        setReadyToConnect(true);
      });

      p.on('connection', (newConn: DataConnection) => {
        console.log('New Connection established');
        setConnections((prevConnections) => [...prevConnections, newConn]);
      });

      setPeer(p);
    }

    return () => {
      if (peer) {
        peer.destroy();
      }
    };
  }, [peer]);

  const connectToPeer = useCallback(
    (connectionId: string) => {
      const newConn = peer?.connect(connectionId);
      if (!newConn) return;

      setConnections((prevConnections) => [...prevConnections, newConn]);
    },
    [peer],
  );

  useEffect(() => {
    // Attempt to connect when ready and hostId is available
    if (readyToConnect && hostId) {
      const connectionExists = connections.some((conn) => conn.peer === hostId);
      if (!connectionExists) {
        console.log('Attempting to connect to hostId:', hostId);
        connectToPeer(hostId);
      }
    }
  }, [readyToConnect, hostId, connectToPeer, connections]);
  
  const setClimbSearchParams = (updatedFilters: SearchRequestPagination) => {
    setClimbSearchParamsState(() => {
      // Size stays at a high number if we don't update it manually.
      setSize(updatedFilters.page + 1);
      return updatedFilters;
    });

    // We only want to use history.replaceState for filter changes as SWR takes care of the actual
    // fetching, and using router.replace assumes we want the result of the SSR page.tsx.
    history.replaceState(null, '', `${window.location.pathname}?${searchParamsToUrlParams(updatedFilters).toString()}`);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getKey = (pageIndex: number, previousPageData: any) => {
    if (previousPageData && previousPageData.climbs.length === 0) return null;

    const queryString = searchParamsToUrlParams({
      ...climbSearchParams,
      page: pageIndex,
    }).toString();

    return constructClimbSearchUrl(parsedParams, queryString);
  };

  useEffect(() => {
    // Iterate over connections whenever they change
    connections.forEach((conn) => {
      if (!conn.open && hostId) {
        conn.on('open', () => {
          console.log(`Connection opened with peer ${conn.peer}`);
          conn.send({ type: 'request-update-queue' });
        });
      }
    });
  }, [connections, hostId]);

  useEffect(() => {
    switch (receivedData?.type) {
      case 'request-update-queue':
        sendData(
          connections,
          peerId,
          {
            type: 'update-queue',
            queue,
            currentClimbQueueItem, // Send the queue data from QueueProvider
          },
          receivedData.source,
        );
        break;
      case 'update-queue':
        if (!receivedData.queue && receivedData.currentClimbQueueItem) {
          setCurrentClimbQueueItemState(receivedData.currentClimbQueueItem);
        }
        setQueueState(() => {
          if (receivedData.currentClimbQueueItem) {
            setCurrentClimbQueueItemState(receivedData.currentClimbQueueItem);
          }
          
          return receivedData.queue;
        });
        break;
    }
  }, [receivedData]);

  const {
    data,
    size,
    setSize,
    isLoading: isFetchingClimbs,
  } = useSWRInfinite(getKey, fetcher, {
    revalidateOnFocus: false,
    revalidateFirstPage: false,
    initialSize: climbSearchParams.page ? climbSearchParams.page + 1 : 1,
  });

  const fetchMoreClimbs = () => {
    setSize((oldSize) => {
      const newParams = { ...climbSearchParams, page: oldSize + 1 };
      // We persist the new page number in the URL so that the page on a hard refresh will
      // be the same as it was before, and hopefully will restore scroll correctly.
      history.replaceState(null, '', `${window.location.pathname}?${searchParamsToUrlParams(newParams).toString()}`);
      return oldSize + 1;
    });
  };

  const hasMoreResults = data && data[0] && size * PAGE_LIMIT < data[0].totalCount;
  const totalSearchResultCount = (data && data[0] && data[0].totalCount) || null;

  const climbSearchResults = data ? data.flatMap((page: { climbs: Climb[] }) => page.climbs) : null;
  const suggestedClimbs = (climbSearchResults || []).filter(
    (item) => !(queue || []).find(({ climb: { uuid } }) => item.uuid === uuid),
  );

  const addToQueue = (climb: Climb) => {
    setQueueState((prevQueue) => {
      const newQueue = [...prevQueue, { climb, addedBy: peerId, uuid: uuidv4(), source: { type: 'local' } }];
      
      // This is an antipattern
      sendData(connections, peerId, {
        type: 'update-queue',
        queue: newQueue
      });

      return [...prevQueue, { climb, uuid: uuidv4() }];
    });
  };

  const removeFromQueue = (climbQueueItem: ClimbQueueItem) => {
    setQueueState((prevQueue) => {
      if (prevQueue === null) {
        return prevQueue;
      }
      const newQueue = prevQueue.filter((item) => item.uuid !== climbQueueItem.uuid);
      
      // This is an antipattenr
      sendData(connections, peerId, {
        type: 'update-queue',
        queue: newQueue
      });

      return newQueue;
    });
  };

  if (climbSearchResults && climbSearchResults.length > 0 && !hasDoneFirstFetch) {
    setHasDoneFirstFetch(true);
  }

  /***
   * Immediately sets current climb, and inserts it into the queue.
   * If there is an active queue, we insert the new climb
   * after the old climb.
   */
  const setCurrentClimb = (climb: Climb) => {
    if (viewOnlyMode) {
      return;
    }

    const queueItem = {
      climb,
      uuid: uuidv4(),
    };

    setQueueState((prevQueue) => {
      setCurrentClimbQueueItemState(queueItem);

      if (!currentClimbQueueItem) {
        // If no current item, append the new one to the queue
        // This is an antipattern
        sendData(connections, peerId, {
          type: 'update-queue',
          queue: [...prevQueue, queueItem],
          currentClimbQueueItem: queueItem,
        });
        return [...prevQueue, queueItem];
      }

      const index = prevQueue.findIndex(({ uuid }) => uuid === currentClimbQueueItem?.uuid);
      if (index === -1) {
        // If the current item is not found, append the new one
        sendData(connections, peerId, {
          type: 'update-queue',
          queue: [...prevQueue, queueItem],
          currentClimbQueueItem: queueItem,
        });
        return [...prevQueue, queueItem];
      }
 
      sendData(connections, peerId, {
        type: 'update-queue',
        queue: [...prevQueue.slice(0, index + 1), queueItem, ...prevQueue.slice(index + 1)],
        currentClimbQueueItem: queueItem,
      });

      // Replace the current item in the queue
      return [...prevQueue.slice(0, index + 1), queueItem, ...prevQueue.slice(index + 1)];
    });
  };
  
  /**
   * Wrapper around the state setter that also fetches more climbs if we're
   * towards the end of the list.
   * @param item The new climbqueue item
   */
  const setCurrentClimbQueueItem = (item: ClimbQueueItem) => {
    if (viewOnlyMode) {
      return;
    }

    setCurrentClimbQueueItemState(item);
    if (
      item.suggested &&
      !queue.find(({ uuid }) => uuid === item.uuid) &&
      climbSearchResults &&
      climbSearchResults.length
    ) {
      setQueueState((prevQueue) => {
        sendData(connections, peerId, {
          type: 'update-queue',
          queue: [...prevQueue, item],
          currentClimbQueueItem: item,
        });

        return [...prevQueue, item];
      });

      if (!isFetchingClimbs && suggestedClimbs.length < 5) {
        fetchMoreClimbs();
      }
    } else {
      sendData(connections, peerId, {
          type: 'update-queue',
          currentClimbQueueItem: item,
          queue,
        });
    }
  };

  const getNextClimbQueueItem = (): ClimbQueueItem | null => {
    if (queue.length === 0 && (!climbSearchResults || climbSearchResults.length === 0)) {
      return null;
    }

    const queueItemIndex = queue.findIndex(({ uuid }) => uuid === currentClimbQueueItem?.uuid);

    // Handle the case where climbSearchResults is null or empty
    if (
      (queue.length === 0 || queue.length <= queueItemIndex + 1) &&
      climbSearchResults &&
      climbSearchResults.length > 0
    ) {
      const nextClimb = suggestedClimbs[0];

      // If there is no next climb found, return null
      if (!nextClimb) {
        return null;
      }

      return {
        uuid: uuidv4(),
        climb: nextClimb,
        suggested: true,
      };
    }

    if (queueItemIndex >= queue.length - 1) {
      return null;
    }

    return queue[queueItemIndex + 1];
  };

  const getPreviousClimbQueueItem = (): ClimbQueueItem | null => {
    const queueItemIndex = queue.findIndex(({ uuid }) => uuid === currentClimbQueueItem?.uuid);

    if (queueItemIndex > 0) {
      return queue[queueItemIndex - 1];
    }

    return null;
  };

  const mirrorClimb = () => {
    console.log('mirrored!')

    setCurrentClimbQueueItemState((prevClimbQueueItem) => {
      return { 
        ...prevClimbQueueItem,
        climb: {
          ...prevClimbQueueItem?.climb,
          mirrored: !prevClimbQueueItem?.climb.mirrored
        }
      }
    })
  }
  const viewOnlyMode = false;

  return (
    <QueueContext.Provider
      value={{
        queue,
        addToQueue,
        removeFromQueue,
        climbSearchResults,
        totalSearchResultCount,
        fetchMoreClimbs,
        hasMoreResults,
        currentClimb: currentClimbQueueItem?.climb || null,
        currentClimbQueueItem: currentClimbQueueItem,
        setCurrentClimb,
        setClimbSearchParams,
        climbSearchParams,
        setCurrentClimbQueueItem,
        getNextClimbQueueItem,
        getPreviousClimbQueueItem,
        isFetchingClimbs,
        hasDoneFirstFetch,
        suggestedClimbs,
        viewOnlyMode,
        mirrorClimb,
        peerId
      }}
    >
      {children}
    </QueueContext.Provider>
  );
};
