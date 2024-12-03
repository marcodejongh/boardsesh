'use client';

import React, { useCallback, useContext, createContext, useEffect, useRef, useReducer } from 'react';
import { useSearchParams } from 'next/navigation';
import Peer, { DataConnection } from 'peerjs';
import { PeerContextType, PeerState, PeerAction, PeerData, PeerConnection } from './types';
import { v4 as uuidv4 } from 'uuid';

const PeerContext = createContext<PeerContextType | undefined>(undefined);
let peerInstance: Peer | undefined;

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
      return { ...state, connections: [...state.connections, action.payload] };
    case 'OPENED_CONNECTION': 
  return {
    ...state,
    connections: state.connections.map(conn => 
      conn.connection.peer === action.payload
        ? { ...conn, state: 'CONNECTED' } // Update the state flag for the opened connection
        : conn
    ),
  };
    default:
      return state;
  }
}

export const PeerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(peerReducer, initialPeerState);
  const hostId = useSearchParams().get('hostId');
  const onQueueUpdateRef = useRef<(data: PeerData) => void>(() => {});

  // New method to set the queue update handler
  const setQueueUpdateHandler = useCallback((handler: (data: PeerData) => void) => {
    onQueueUpdateRef.current = handler;
  }, []);

  const receivedDataRef = useRef((data: PeerData) => {
    switch (data.type) {
      case 'request-update-queue':
        // This case remains the same
        break;
      case 'update-queue':
        // Forward queue updates to the queue context
        onQueueUpdateRef.current(data);
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
        console.log('Receiving connection ', newConn.peer)
        setupHandlers(newConn, dispatch, receivedDataRef, state)
      });

      dispatch({ type: 'SET_PEER', payload: p });
    }

    // return () => {
    //   if (state.peer) {
    //     state.peer.destroy();
    //   }
    // };
  });

  useEffect(() => {
    state.connections.filter(con => con && con.state === 'CONNECTING' && !con.connection.open).forEach(({ connection: conn }) => {
      setupHandlers(conn, dispatch, receivedDataRef, state);
    });
  }, [state.connections]);

  const connectToPeer = useCallback(
    (connectionId: string) => {
      if (!state.peer) return;

      const newConn = state.peer.connect(connectionId);
      if (!newConn) return;

      dispatch({
        type: 'UPDATE_CONNECTIONS',
        payload: [...state.connections, {
          connection: newConn,
          state: 'CONNECTING'
        }],
      });
    },
    [state.peer, state.connections],
  );

  useEffect(() => {
    if (state.readyToConnect && hostId) {
      const connectionExists = state.connections.some((conn) => conn.connection.peer === hostId);
      if (!connectionExists) {
        console.log('Attempting to connect to hostId:', hostId);
        connectToPeer(hostId);
      }
    }
  }, [state.readyToConnect, hostId, connectToPeer, state.connections]);

  const sendData = 
    (data: PeerData, connectionId: string | null = null) => {
      const message = { ...data, source: state.peerId, messageId: uuidv4() };

      if (connectionId) {
        const connection = state.connections.find(({connection: conn}) => conn.peer === connectionId)?.connection;
        if (connection) {
          connection.send(message);
        } else {
          console.error(`No active connection with ID ${connectionId}`);
        }
      } else {
        state.connections.forEach(({ connection }) => connection.send(message));
      }
    };

    const contextValue: PeerContextType = {
    peerId: state.peerId,
    connections: state.connections,
    sendData,
    connectToPeer,
    setQueueUpdateHandler, // Add this to the context value
  };

  return <PeerContext.Provider value={contextValue}>{children}</PeerContext.Provider>;
};

export const usePeerContext = () => {
  const context = useContext(PeerContext);
  if (!context) {
    throw new Error('usePeerContext must be used within a PeerProvider');
  }
  return context;
};

function setupHandlers(conn: DataConnection, dispatch: React.Dispatch<PeerAction>, receivedDataRef: React.MutableRefObject<(data: PeerData) => void>, state: PeerState) {
  console.log('Setting up listeners for', conn.peer);

  conn.on('open', () => {
    console.log(`Connection opened with peer ${conn.peer}`);
    dispatch({
      type: 'ADD_CONNECTION',
      payload: ({ connection: conn, state: 'CONNECTED' } as PeerConnection),
    });

    conn.on('data', (data: any) => {
    console.log('Received data:', data);
    receivedDataRef.current(data);
  });

  conn.on('close', () => {
    console.log(`Connection closed with peer ${conn.peer}`);
    dispatch({
      type: 'UPDATE_CONNECTIONS',
      payload: state.connections.filter(({ connection }) => connection.peer !== conn.peer),
    });
  });

  conn.on('error', (err) => {
    console.error(`Error with peer ${conn.peer}:`, err);
  });
  });

  
}

