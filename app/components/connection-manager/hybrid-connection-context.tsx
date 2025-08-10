'use client';

import React, { useCallback, useContext, createContext } from 'react';
import { useSearchParams } from 'next/navigation';
import { PeerProvider, usePeerContext } from './peer-context';
import { WebSocketProvider, useWebSocketContext } from './websocket-context';
import { ReceivedPeerData, PeerData, PeerContextType } from './types';

interface HybridConnectionContextType extends PeerContextType {
  connectionMode: 'peerjs' | 'websocket' | 'none';
  isControllerMode: boolean;
}

const HybridConnectionContext = createContext<HybridConnectionContextType | undefined>(undefined);

const HybridConnectionInner: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const searchParams = useSearchParams();
  const controllerUrl = searchParams.get('controllerUrl');
  const isControllerMode = !!controllerUrl;
  
  // Get contexts from both providers
  const peerContext = usePeerContext();
  const wsContext = useWebSocketContext();
  
  // Determine which connection mode to use
  const connectionMode: 'peerjs' | 'websocket' | 'none' = 
    isControllerMode && wsContext.isConnected ? 'websocket' :
    peerContext.hasConnected ? 'peerjs' :
    isControllerMode ? 'websocket' : 
    'peerjs';
  
  // Create unified interface that routes to the appropriate underlying system
  const sendData = useCallback((data: PeerData, connectionId?: string | null) => {
    if (connectionMode === 'websocket') {
      // For WebSocket mode, ignore connectionId since controller handles routing
      wsContext.sendData(data);
    } else {
      // For PeerJS mode, use normal peer-to-peer sending
      peerContext.sendData(data, connectionId);
    }
  }, [connectionMode, wsContext, peerContext]);
  
  const subscribeToData = useCallback((callback: (data: ReceivedPeerData) => void) => {
    if (connectionMode === 'websocket') {
      return wsContext.subscribeToData(callback);
    } else {
      return peerContext.subscribeToData(callback);
    }
  }, [connectionMode, wsContext, peerContext]);
  
  // For WebSocket mode, we simulate peer context values
  const contextValue: HybridConnectionContextType = {
    // Connection state
    peerId: connectionMode === 'websocket' ? 'boardsesh-client' : peerContext.peerId,
    hostId: connectionMode === 'websocket' ? wsContext.controllerId : peerContext.hostId,
    isConnecting: connectionMode === 'websocket' ? !wsContext.isConnected : peerContext.isConnecting,
    hasConnected: connectionMode === 'websocket' ? wsContext.isConnected : peerContext.hasConnected,
    connections: connectionMode === 'websocket' ? [] : peerContext.connections,
    
    // Leadership (controller always leads in WebSocket mode)
    currentLeader: connectionMode === 'websocket' ? wsContext.controllerId : peerContext.currentLeader,
    isLeader: connectionMode === 'websocket' ? false : peerContext.isLeader, // Controller is always leader
    initiateLeaderElection: connectionMode === 'websocket' ? () => {} : peerContext.initiateLeaderElection,
    
    // Communication
    sendData,
    subscribeToData,
    connectToPeer: connectionMode === 'websocket' ? () => {} : peerContext.connectToPeer,
    
    // Hybrid-specific
    connectionMode,
    isControllerMode
  };
  
  return (
    <HybridConnectionContext.Provider value={contextValue}>
      {children}
    </HybridConnectionContext.Provider>
  );
};

export const HybridConnectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <PeerProvider>
      <WebSocketProvider>
        <HybridConnectionInner>
          {children}
        </HybridConnectionInner>
      </WebSocketProvider>
    </PeerProvider>
  );
};

export const useHybridConnection = () => {
  const context = useContext(HybridConnectionContext);
  if (!context) {
    throw new Error('useHybridConnection must be used within a HybridConnectionProvider');
  }
  return context;
};

// Export a hook that provides the same interface as usePeerContext
// but automatically routes to the appropriate connection method
export const useConnectionContext = useHybridConnection;