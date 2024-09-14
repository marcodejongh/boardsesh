"use client"

import React, { useState, useEffect, createContext } from "react";
import Peer, { DataConnection } from "peerjs";
import { PeerContextType, PeerProviderProps, PeerConnectionState } from "./types"; // Assuming your types are in a file named types.ts
import { message } from "antd";
export const PeerContext = createContext<PeerContextType | undefined>(undefined);
let peerInstance: Peer | undefined;

const PeerProvider: React.FC<PeerProviderProps> = ({ children }) => {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [connections, setConnections] = useState<PeerConnectionState>([]);
  const [receivedData, setReceivedData] = useState<any>();
  const [peerId, setPeerId] = useState<string | null>(null);
  const [readyToConnect, setReadyToConnect] = useState(false);

  useEffect(() => {
    if (!peerInstance) {
      peerInstance = new Peer({ debug: 1 });
      const p = peerInstance;
      p.on("open", (id: string) => {
        console.log("My peer ID is:", id);
        setPeerId(id);
        setReadyToConnect(true);
      });

      p.on("connection", (newConn: DataConnection) => {
        console.log("New Connection established");

        newConn.on("data", (data: any) => {
          console.log("Received data:", data);
          setReceivedData(data); // Store received data in an array
        });
        
        setConnections((prevConnections) => {
          const connections = [...prevConnections, newConn];
          message.info(`A user connected, now have ${connections.length} users connected`);
          return connections;
        });
      });

      setPeer(p);
    }

    return () => {
      if (peer) {
        peer.destroy();
      }
    };
  }, [peer]);

  const sendData = (data: any, connectionId: string | null = null) => {
    console.log(`Sending `, data);
    if (connectionId) {
      const connection = connections.find((conn) => conn.peer === connectionId);
      if (connection) {
        connection.send(data);
      } else {
        console.error(`No active connection with ID ${connectionId}`);
      }
    } else {
      // Broadcast to all connections
      connections.forEach((conn) => conn.send(data));
    }
  };

  const connectToPeer = (connectionId: string) => {
    const newConn = peer?.connect(connectionId);

    if (newConn) {
      newConn.on("data", (data: any) => {
        console.log("Received data:", data);
        setReceivedData(data); // Store received data in an array
      });

      setConnections((prevConnections) => [...prevConnections, newConn]);
    }
  };

  return (
    <PeerContext.Provider value={{ readyToConnect, receivedData, sendData, connectToPeer, peerId }}>
      {children}
    </PeerContext.Provider>
  );
};

export default PeerProvider;
