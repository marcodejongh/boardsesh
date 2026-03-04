'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { connectionManager, ConnectionState } from './websocket-connection-manager';

interface ConnectionContextValue {
  state: ConnectionState;
  lastActivity: number | null;
  name: string | null;
  error?: Error | null;
  forceReconnect: () => void;
}

const WebSocketConnectionContext = createContext<ConnectionContextValue | null>(null);

export const WebSocketConnectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [snapshot, setSnapshot] = useState(connectionManager.getSnapshot());

  useEffect(() => {
    return connectionManager.subscribe((next) => setSnapshot(next));
  }, []);

  const value = useMemo<ConnectionContextValue>(() => ({
    state: snapshot.state,
    lastActivity: snapshot.lastActivity,
    name: snapshot.name,
    error: snapshot.error,
    forceReconnect: () => connectionManager.forceReconnect(snapshot.name ?? undefined),
  }), [snapshot]);

  return (
    <WebSocketConnectionContext.Provider value={value}>
      {children}
    </WebSocketConnectionContext.Provider>
  );
};

export function useWebSocketConnection(): ConnectionContextValue {
  const ctx = useContext(WebSocketConnectionContext);
  if (!ctx) {
    // Fallback to direct manager access so hook works even without the provider
    const snapshot = connectionManager.getSnapshot();
    return {
      state: snapshot.state,
      lastActivity: snapshot.lastActivity,
      name: snapshot.name,
      error: snapshot.error,
      forceReconnect: () => connectionManager.forceReconnect(snapshot.name ?? undefined),
    };
  }
  return ctx;
}
