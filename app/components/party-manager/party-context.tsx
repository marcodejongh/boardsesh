'use client';

import React, { useContext, createContext, useEffect, useCallback, useState, useMemo } from 'react';
import { useBoardProvider } from '../board-provider/board-provider-context';
import { useConnection, useDaemonConnection } from '../connection-manager/use-connection';
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
  const { sendData, peerId, subscribeToData, connections,isDaemonMode } = useConnection();
  const daemonConnection = useDaemonConnection();
  const { username: boardUsername } = useBoardProvider();

  const username = boardUsername || '';

  const [webSocketData, setWebSocketData] = useState<Record<string, WebSocketData>>({});

  // Derive party from connections and webSocketData (for PeerJS mode)
  const peerJsParty: ConnectedUser[] = useMemo(
    () =>
      connections.map((connection) => ({
        ...(webSocketData[connection.connection.peer] || {}),
        id: connection.connection.peer,
        isHost: connection.isHost,
      })),
    [connections, webSocketData],
  );

  // For daemon mode, convert daemon users to ConnectedUser format
  const daemonParty: ConnectedUser[] = useMemo(() => {
    if (!daemonConnection?.daemonUsers) return [];
    // Filter out self from connected users list
    return daemonConnection.daemonUsers
      .filter((user) => user.id !== daemonConnection.peerId)
      .map((user) => ({
        username: user.username,
        id: user.id,
        isHost: user.isLeader,
      }));
  }, [daemonConnection?.daemonUsers, daemonConnection?.peerId]);

  // Choose party based on mode
  const party = isDaemonMode ? daemonParty : peerJsParty;

  // Single consolidated subscription for PeerJS mode peer data
  useEffect(() => {
    // Skip PeerJS-specific logic in daemon mode
    if (isDaemonMode) return;

    const handlePeerData = (data: ReceivedPeerData) => {
      switch (data.type) {
        case 'send-peer-info':
          // Update stored peer info
          setWebSocketData((prev) => ({
            ...prev,
            [data.source]: { username: data.username },
          }));
          break;
        case 'new-connection':
          // Respond with our peer info
          sendData({ type: 'send-peer-info', username }, data.source);
          break;
      }
    };

    const unsubscribe = subscribeToData(handlePeerData);
    return () => unsubscribe();
  }, [subscribeToData, sendData, username, isDaemonMode]);

  // Get the effective username based on mode
  const effectiveUserName = isDaemonMode
    ? daemonConnection?.daemonUsers?.find((u) => u.id === daemonConnection.peerId)?.username ||
      username ||
      daemonConnection?.peerId ||
      ''
    : username || peerId || '';

  const contextValue: PartyContextType = {
    userName: effectiveUserName,
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
