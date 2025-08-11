'use client';

import { useContext } from 'react';
import { useSearchParams } from 'next/navigation';
import { PeerContext } from './peer-context';
import { WebSocketContext } from './websocket-context';
import { PeerContextType } from './types';

/**
 * Hook that returns the appropriate connection context (WebSocket or PeerJS)
 * based on whether we're in controller mode or party mode
 */
export const useConnection = (): PeerContextType => {
  const searchParams = useSearchParams();
  const controllerUrl = searchParams.get('controllerUrl');
  const isControllerMode = !!controllerUrl;

  // Only try to use the context that should be available
  if (isControllerMode) {
    const wsContext = useContext(WebSocketContext);
    if (!wsContext) {
      throw new Error('useConnection must be used within a WebSocketProvider when in controller mode');
    }
    
    // Adapt WebSocket context to match PeerContextType interface
    return {
      peerId: 'boardsesh-client',
      hostId: wsContext.controllerId,
      isConnecting: !wsContext.isConnected,
      hasConnected: wsContext.isConnected,
      connections: [], // WebSocket mode doesn't have peer connections
      currentLeader: wsContext.controllerId,
      isLeader: false, // Controller is always the leader
      initiateLeaderElection: () => {}, // No-op in WebSocket mode
      sendData: wsContext.sendData,
      subscribeToData: wsContext.subscribeToData,
      connectToPeer: () => {}, // No-op in WebSocket mode
    };
  } else {
    const peerContext = useContext(PeerContext);
    if (!peerContext) {
      throw new Error('useConnection must be used within a PeerProvider when in party mode');
    }
    return peerContext;
  }
};