'use client';

import { useContext } from 'react';
import { useSearchParams } from 'next/navigation';
import { PeerContext } from './peer-context';
import { WebSocketContext } from './websocket-context';
import { DaemonContext, DaemonContextType } from './daemon-context';
import { PeerContextType } from './types';

/**
 * Hook that returns the appropriate connection context (WebSocket, Daemon, or PeerJS)
 * based on the current connection mode
 */
export const useConnection = (): PeerContextType & { isDaemonMode?: boolean; disconnect?: () => void } => {
  const searchParams = useSearchParams();
  const controllerUrl = searchParams.get('controllerUrl');
  const isControllerMode = !!controllerUrl;

  // Always call hooks at the top level (React hooks rules)
  const peerContext = useContext(PeerContext);
  const wsContext = useContext(WebSocketContext);
  const daemonContext = useContext(DaemonContext);

  // Priority: Controller > Daemon > PeerJS

  // 1. Controller mode
  if (isControllerMode && wsContext) {
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
  }

  // 2. Daemon mode
  if (daemonContext) {
    return daemonContext;
  }

  // 3. PeerJS mode (default)
  if (peerContext) {
    return peerContext;
  }

  // Fallback: no provider found
  throw new Error('useConnection must be used within a ConnectionProviderWrapper');
};

/**
 * Hook that returns daemon-specific context if in daemon mode
 */
export const useDaemonConnection = (): DaemonContextType | null => {
  const daemonContext = useContext(DaemonContext);
  return daemonContext || null;
};