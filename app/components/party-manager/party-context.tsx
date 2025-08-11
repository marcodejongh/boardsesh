'use client';

import React, { useContext, createContext, useEffect, useCallback, useState, useMemo } from 'react';
import { useBoardProvider } from '../board-provider/board-provider-context';
import { useConnection } from '../connection-manager/use-connection';
import { ReceivedPeerData, SendPeerInfo } from '../connection-manager/types';

type ConnectedUser = {
  username: string;
  avatar?: string;
  id: string;
  isHost?: boolean;
};

type PartyContextType = {
  userName: string;
  connectedUsers: ConnectedUser[];
};

type WebSocketData = Pick<SendPeerInfo, 'username'>;

const PartyContext = createContext<PartyContextType | undefined>(undefined);

export const PartyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { sendData, peerId, subscribeToData, connections } = useConnection();
  const { username: boardUsername } = useBoardProvider();

  const username = boardUsername || '';

  const [webSocketData, setWebSocketData] = useState<Record<string, WebSocketData>>({});

  // Derive party from both connections and webSocketData
  const party: ConnectedUser[] = useMemo(
    () =>
      connections.map((connection) => ({
        ...(webSocketData[connection.connection.peer] || {}),
        id: connection.connection.peer,
      })),
    [connections, webSocketData],
  );

  useEffect(() => {
    const handleWebSocketMessage = (data: ReceivedPeerData) => {
      switch (data.type) {
        case 'send-peer-info':
          setWebSocketData((prev) => ({
            ...prev,
            [data.source]: { username: data.username },
          }));
          break;
        case 'new-connection':
          sendData({ type: 'send-peer-info', username }, data.source);
      }
    };

    // Subscribe to websocket
    const unsubscribe = subscribeToData(handleWebSocketMessage);
    return () => unsubscribe();
  }, [subscribeToData, sendData, username]);

  const handlePeerData = useCallback(
    (data: ReceivedPeerData) => {
      console.log(`${new Date().getTime()} Party context received: ${data.type} from: ${data.source}`);

      switch (data.type) {
        case 'new-connection':
          sendData(
            {
              type: 'send-peer-info',
              username,
            },
            data.source,
          );
          break;
        case 'send-peer-info':
          break;
      }
    },
    [sendData, username],
  );

  useEffect(() => {
    const unsubscribe = subscribeToData(handlePeerData);
    return () => unsubscribe();
  }, [subscribeToData, handlePeerData]);

  // In a real implementation, this would likely use useState and be updated
  // based on peer connections/disconnections
  const contextValue: PartyContextType = {
    userName: username || peerId || '',
    connectedUsers: party,
  };

  return <PartyContext.Provider value={contextValue}>{children}</PartyContext.Provider>;
};

export const usePartyContext = () => {
  const context = useContext(PartyContext);
  if (!context) {
    throw new Error('usePartyContext must be used within a PartyProvider');
  }
  return context;
};

export default PartyContext;
