'use client';

import React, { useCallback, useContext, createContext, useEffect, useRef, useReducer } from 'react';
import { useSearchParams } from 'next/navigation';
import Peer, { DataConnection } from 'peerjs';
import { PeerContextType, PeerState, PeerAction, PeerData, PeerConnection, isPeerData, ReceivedPeerData } from './types';
import { v4 as uuidv4 } from 'uuid';
import { peerReducer, initialPeerState } from './reducer';

const PeerContext = createContext<PeerContextType | undefined>(undefined);
let peerInstance: Peer | undefined;

type DataHandler = {
  id: string;
  callback: (data: ReceivedPeerData) => void;
};

const broadcastPeerList = (
  peerId: string,
  connections: PeerConnection[],
  sendData: (data: PeerData, connectionId: string | null) => void,
) => {
  const peerList = connections.map((conn) => conn.connection.peer);
  sendData(
    {
      type: 'broadcast-other-peers',
      peers: peerList,
    },
    peerId,
  );
};

export const PeerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(peerReducer, initialPeerState);
  const urlHostId = useSearchParams().get('hostId');
  const dataHandlers = useRef<DataHandler[]>([]);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const subscribeToData = useCallback((callback: (data: ReceivedPeerData) => void) => {
    const handlerId = uuidv4();
    dataHandlers.current.push({ id: handlerId, callback });

    return () => {
      dataHandlers.current = dataHandlers.current.filter((handler) => handler.id !== handlerId);
    };
  }, []);

  const notifySubscribers = useCallback((data: ReceivedPeerData) => {
    dataHandlers.current.forEach((handler) => {
      try {
        handler.callback(data);
      } catch (error) {
        console.error('Error in data handler:', error);
      }
    });
  }, []);

  const sendData = useCallback((data: PeerData, connectionId: string | null = null) => {
    const currentState = stateRef.current;
    const message = { ...data, source: currentState.peerId, messageId: uuidv4() };

    if (connectionId) {
      const connection = currentState.connections.find(
        ({ connection: conn }) => conn.peer === connectionId,
      )?.connection;

      if (connection) {
        connection.send(message);
      } else {
        console.error(`No active connection with ID ${connectionId}`);
      }
    } else {
      currentState.connections.forEach(({ connection }) => {
        console.log(`Sending to ${connection.peer}`, message);
        connection.send(message);
      });
    }
  }, []);

  const connectToPeer = useCallback((connectionId: string, isHost?: boolean) => {
    console.log('Connecting to peer:', connectionId);
    const currentState = stateRef.current;

    if (!currentState.peer) {
      console.error('Peer not initialized');
      return;
    }

    if (connectionId === currentState.peerId) {
      console.log('Skipping self-connection');
      return;
    }

    // Instead of checking for existing connection, remove it if it exists
    const existingConnection = currentState.connections.find((conn) => conn.connection.peer === connectionId);
    if (existingConnection) {
      dispatch({
        type: 'REMOVE_CONNECTION',
        payload: connectionId,
      });
    }

    const newConn = currentState.peer.connect(connectionId);
    if (!newConn) {
      console.error('Failed to create connection');
      return;
    }

    console.log('Created new connection:', connectionId);
    dispatch({
      type: 'ADD_CONNECTION',
      payload: {
        connection: newConn,
        state: 'CONNECTING',
        isHost: existingConnection?.isHost || !!isHost,
      },
    });

    setupHandlers(newConn, dispatch, receivedDataRef, stateRef);
  }, []);

  const receivedDataRef = useRef((data: ReceivedPeerData) => {
    const currentState = stateRef.current;

    switch (data.type) {
      case 'broadcast-other-peers':
        console.log('Received peer broadcast:', data.peers);
        if (Array.isArray(data.peers)) {
          data.peers.forEach((peerId) => {
            const hasConnection = currentState.connections.some((conn) => conn.connection.peer === peerId);
            if (!hasConnection && peerId !== currentState.peerId) {
              console.log('Connecting to new peer from broadcast:', peerId);
              connectToPeer(peerId);
            }
          });
        }
        break;
      case 'new-connection':
      case 'request-update-queue':
      case 'update-queue':
      default:
        notifySubscribers(data);
        break;
    }
  });

  useEffect(() => {
    if (!peerInstance) {
      peerInstance = new Peer({ debug: 1 });
      const p = peerInstance;

      p.on('open', (id: string) => {
        dispatch({ type: 'SET_PEER_ID', payload: id });
        dispatch({ type: 'SET_READY_TO_CONNECT', payload: true });
      });

      p.on('connection', (newConn: DataConnection) => {
        console.log('Receiving connection ', newConn.peer);
        setupHandlers(newConn, dispatch, receivedDataRef, stateRef);
      });

      p.on('error', (error) => {
        const failedPeerId = error.message.replace('Could not connect to peer ', '').trim();
        const failedConnection = state.connections.find((conn) => conn.connection.peer === failedPeerId);

        switch (error.type) {
          case 'disconnected':
          case 'socket-closed':
            // First remove the old connection
            dispatch({
              type: 'REMOVE_CONNECTION',
              payload: failedPeerId,
            });

            // Then attempt to reconnect after a short delay
            setTimeout(() => {
              if (failedConnection?.isHost) {
                // Only reconnect if it was a host connection
                console.log(`Attempting to reconnect to ${failedPeerId}`);
                connectToPeer(failedPeerId);
              }
            }, 1000);
            break;

          case 'peer-unavailable':
            // Just remove the connection, peer isn't available
            dispatch({
              type: 'REMOVE_CONNECTION',
              payload: failedPeerId,
            });
            break;

          default:
            console.error(`Connection error with peer ${failedPeerId}:`, error);
            dispatch({
              type: 'REMOVE_CONNECTION',
              payload: failedPeerId,
            });
        }
      });

      dispatch({ type: 'SET_PEER', payload: p });
    }
  });

  useEffect(() => {
    state.connections
      .filter((con) => con && con.state === 'CONNECTED')
      .forEach((conn) => {
        const peerId = conn.connection.peer;

        // Only send broadcast and notify if this connection hasn't been processed
        if (conn.state === 'CONNECTED') {
          // First, broadcast peer list
          broadcastPeerList(peerId, state.connections, sendData);

          // Then notify subscribers about the new connection
          notifySubscribers({
            type: 'new-connection',
            source: peerId,
          });

          // Update connection state to READY
          dispatch({
            type: 'UPDATE_CONNECTION_STATE',
            payload: { peerId, state: 'READY' },
          });
        }
      });
  }, [state.connections, sendData, notifySubscribers]);

  useEffect(() => {
    if (state.readyToConnect && urlHostId) {
      const connectionExists = state.connections.some((conn) => conn.connection.peer === urlHostId);
      if (!connectionExists) {
        try {
          connectToPeer(urlHostId, true);
          // Remove the hostId search param
          const url = new URL(window.location.href);
          url.searchParams.delete('hostId');
          window.history.replaceState(null, '', url);
        } catch (err) {
          // Fallback error handling
          const url = new URL(window.location.href);
          url.searchParams.delete('hostId');
          window.history.replaceState(null, '', url);
        }
      }
    }
  }, [state.readyToConnect, urlHostId, connectToPeer, state.connections]);

  const contextValue: PeerContextType = {
    peerId: state.peerId,
    connections: state.connections,
    sendData,
    connectToPeer,
    subscribeToData,
    hostId: state.connections.find((conn) => conn.isHost)?.connection?.peer || urlHostId,
    isConnecting:
      !state.peerId || (state.connections.length > 0 && state.connections.some((conn) => conn.state === 'READY')),
    hasConnected: state.connections.length > 0 && state.connections.some((conn) => conn.state === 'READY'),
  };

  return <PeerContext.Provider value={contextValue}>{children}</PeerContext.Provider>;
};

function setupHandlers(
  conn: DataConnection & { _handlersSetup?: boolean },
  dispatch: React.Dispatch<PeerAction>,
  receivedDataRef: React.MutableRefObject<(data: ReceivedPeerData) => void>,
  stateRef: React.MutableRefObject<PeerState>,
) {
  if (conn._handlersSetup) {
    console.log('Handlers already setup for:', conn.peer);
    return;
  }

  console.log('Setting up listeners for', conn.peer);
  conn._handlersSetup = true;

  setupDataHandlers(conn, receivedDataRef, dispatch, stateRef);

  if (!conn.open) {
    conn.on('open', () => {
      console.log(`Connection opened with peer ${conn.peer}`);
      dispatch({
        type: 'ADD_CONNECTION',
        payload: { connection: conn, state: 'CONNECTED' } as PeerConnection,
      });
    });
  } else {
    dispatch({
      type: 'ADD_CONNECTION',
      payload: { connection: conn, state: 'CONNECTED' } as PeerConnection,
    });
  }
}

function setupDataHandlers(
  conn: DataConnection,
  receivedDataRef: React.MutableRefObject<(data: ReceivedPeerData) => void>,
  dispatch: React.Dispatch<PeerAction>,
  stateRef: React.MutableRefObject<PeerState>,
) {
  conn.on('data', ((data: unknown) => {
    console.log('Received data from peer:', conn.peer, data);

    if (isPeerData(data)) {
      receivedDataRef.current(data);
    } else {
      console.error('Received invalid data format:', data);
    }
  }) as (data: unknown) => void);

  conn.on('close', () => {
    console.log(`Connection closed with peer ${conn.peer}`);
    dispatch({
      type: 'UPDATE_CONNECTIONS',
      payload: stateRef.current.connections.filter(({ connection }) => connection.peer !== conn.peer),
    });
  });

  conn.on('error', (err) => {
    console.error(`Error with peer ${conn.peer}:`, err);
  });
}

export const usePeerData = (callback: (data: PeerData) => void) => {
  const { subscribeToData } = usePeerContext();

  useEffect(() => {
    const unsubscribe = subscribeToData(callback);
    return () => unsubscribe();
  }, [callback, subscribeToData]);
};

export const usePeerContext = () => {
  const context = useContext(PeerContext);
  if (!context) {
    throw new Error('usePeerContext must be used within a PeerProvider');
  }
  return context;
};

export default PeerProvider;
