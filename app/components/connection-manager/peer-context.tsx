'use client';

import React, { useCallback, useContext, createContext, useEffect, useRef, useReducer } from 'react';
import { useSearchParams } from 'next/navigation';
import Peer, { DataConnection } from 'peerjs';
import { PeerContextType, PeerState, PeerAction, PeerData, PeerConnection } from './types';
import { v4 as uuidv4 } from 'uuid';

const PeerContext = createContext<PeerContextType | undefined>(undefined);
let peerInstance: Peer | undefined;

type DataHandler = {
  id: string;
  callback: (data: PeerData) => void;
};

const initialPeerState: PeerState = {
  peer: null,
  peerId: null,
  connections: [],
  readyToConnect: false,
};

function peerReducer(state: PeerState, action: PeerAction): PeerState {
  switch (action.type) {
    case 'SET_PEER':
      return { ...state, peer: action.payload };
    case 'SET_PEER_ID':
      return { ...state, peerId: action.payload };
    case 'SET_READY_TO_CONNECT':
      return { ...state, readyToConnect: action.payload };
    case 'UPDATE_CONNECTIONS':
      return { ...state, connections: action.payload };
    case 'ADD_CONNECTION':
      if (state.connections.some((conn) => conn.connection.peer === action.payload.connection.peer)) {
        return state;
      }
      return { ...state, connections: [...state.connections, action.payload] };
    case 'OPENED_CONNECTION':
      return {
        ...state,
        connections: state.connections.map((conn) =>
          conn.connection.peer === action.payload ? { ...conn, state: 'CONNECTED' } : conn,
        ),
      };
    default:
      return state;
  }
}

export const PeerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(peerReducer, initialPeerState);
  const hostId = useSearchParams().get('hostId');
  const dataHandlers = useRef<DataHandler[]>([]);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const subscribeToData = useCallback((callback: (data: PeerData) => void) => {
    const handlerId = uuidv4();
    dataHandlers.current.push({ id: handlerId, callback });

    return () => {
      dataHandlers.current = dataHandlers.current.filter((handler) => handler.id !== handlerId);
    };
  }, []);

  const notifySubscribers = useCallback((data: PeerData) => {
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

  const connectToPeer = useCallback((connectionId: string) => {
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

    const existingConnection = currentState.connections.find((conn) => conn.connection.peer === connectionId);

    if (existingConnection) {
      console.log('Connection already exists:', connectionId);
      return;
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
      },
    });

    setupHandlers(newConn, dispatch, receivedDataRef, stateRef);
  }, []);

  const receivedDataRef = useRef((data: PeerData) => {
    const currentState = stateRef.current;

    switch (data.type) {
      case 'broadcast-other-peers':
        console.log('Received peer broadcast:', data.peers);
        if (Array.isArray(data.peers)) {
          let newConnectionMade = false;
          data.peers.forEach((peerId) => {
            const hasConnection = currentState.connections.some((conn) => conn.connection.peer === peerId);
            if (!hasConnection && peerId !== currentState.peerId) {
              console.log('Connecting to new peer from broadcast:', peerId);
              connectToPeer(peerId);
              newConnectionMade = true;
            }
          });
        }
        break;
      case 'request-update-queue':
        break;
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
        const currentState = stateRef.current;

        setupHandlers(newConn, dispatch, receivedDataRef, stateRef);
      });

      dispatch({ type: 'SET_PEER', payload: p });
    }
  }, []);

  useEffect(() => {
    const connectedPeers = state.connections
      .filter((con) => con && con.state === 'CONNECTED')
      .forEach((conn) => {
        sendData(
          {
            type: 'broadcast-other-peers',
            peers: state.connections.map((conn) => conn.connection.peer),
          },
          conn.connection.peer,
        );
      });
  }, [state.connections, sendData]);

  useEffect(() => {
    if (state.readyToConnect && hostId) {
      const connectionExists = state.connections.some((conn) => conn.connection.peer === hostId);
      if (!connectionExists) {
        console.log('Attempting to connect to hostId:', hostId);
        connectToPeer(hostId);
      }
    }
  }, [state.readyToConnect, hostId, connectToPeer]);

  const contextValue: PeerContextType = {
    peerId: state.peerId,
    connections: state.connections,
    sendData,
    connectToPeer,
    subscribeToData,
  };

  return <PeerContext.Provider value={contextValue}>{children}</PeerContext.Provider>;
};

function setupHandlers(
  conn: DataConnection,
  dispatch: React.Dispatch<PeerAction>,
  receivedDataRef: React.MutableRefObject<(data: PeerData) => void>,
  stateRef: React.MutableRefObject<PeerState>,
) {
  if ((conn as any)._handlersSetup) {
    console.log('Handlers already setup for:', conn.peer);
    return;
  }

  console.log('Setting up listeners for', conn.peer);
  (conn as any)._handlersSetup = true;

  // Always set up data, close, and error handlers immediately
  setupDataHandlers(conn, receivedDataRef, dispatch, stateRef);

  // Handle the open event separately
  if (!conn.open) {
    conn.on('open', () => {
      console.log(`Connection opened with peer ${conn.peer}`);
      dispatch({
        type: 'ADD_CONNECTION',
        payload: { connection: conn, state: 'CONNECTED' } as PeerConnection,
      });
    });
  } else {
    // If already open, dispatch the connection immediately
    dispatch({
      type: 'ADD_CONNECTION',
      payload: { connection: conn, state: 'CONNECTED' } as PeerConnection,
    });
  }
}

function setupDataHandlers(
  conn: DataConnection,
  receivedDataRef: React.MutableRefObject<(data: PeerData) => void>,
  dispatch: React.Dispatch<PeerAction>,
  stateRef: React.MutableRefObject<PeerState>,
) {
  conn.on('data', (data: any) => {
    console.log('Received data from peer:', conn.peer, data);
    receivedDataRef.current(data);
  });

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
