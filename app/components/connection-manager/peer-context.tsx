'use client';

import React, { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react';
import Peer, { DataConnection } from 'peerjs';
import { PeerContextType, PeerProviderProps, PeerConnectionState, PeerData } from './types';
import { useSearchParams } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';

export const PeerContext = createContext<PeerContextType | undefined>(undefined);
let peerInstance: Peer | undefined;

export const usePeerContext = () => {
  const context = useContext(PeerContext);
  if (!context) {
    throw new Error('usePeerContext must be used within a PeerProvider');
  }
  return context;
};

const PeerProvider: React.FC<PeerProviderProps> = ({ children }) => {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [connections, setConnections] = useState<PeerConnectionState>([]);
  const [receivedData, setReceivedData] = useState<PeerData | null>(null);

  const [peerId, setPeerId] = useState<string | null>(null);
  const [readyToConnect, setReadyToConnect] = useState(false);

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

  const connectToPeer = useCallback(
    (connectionId: string) => {
      const newConn = peer?.connect(connectionId);
      if (!newConn) return;

      setConnections((prevConnections) => [...prevConnections, newConn]);
    },
    [peer],
  );

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

  const sendData = (data: PeerData, connectionId: string | null = null) => {
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

  return (
    <PeerContext.Provider
      value={{ readyToConnect, receivedData, sendData, connectToPeer, peerId, connections, hostId }}
    >
      {children}
    </PeerContext.Provider>
  );
};

export default PeerProvider;
