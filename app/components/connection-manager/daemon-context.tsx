'use client';

import React, { useCallback, useContext, createContext, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { ReceivedPeerData, PeerData, PeerConnection, PeerContextType, isPeerData } from './types';
import type { ClimbQueueItem } from '../queue-control/types';
import { useDaemonUrl } from './use-daemon-url';
import { useBoardProvider } from '../board-provider/board-provider-context';

// Daemon-specific message types
interface SessionJoinedMessage {
  type: 'session-joined';
  clientId: string;
  sessionId: string;
  users: Array<{ id: string; username: string; isLeader: boolean }>;
  queue: ClimbQueueItem[];
  currentClimbQueueItem: ClimbQueueItem | null;
  isLeader: boolean;
}

interface UserJoinedMessage {
  type: 'user-joined';
  user: { id: string; username: string; isLeader: boolean };
}

interface UserLeftMessage {
  type: 'user-left';
  clientId: string;
}

interface LeaderChangedMessage {
  type: 'leader-changed';
  leaderId: string;
}

interface HeartbeatResponseMessage {
  type: 'heartbeat-response';
  originalTimestamp: number;
  responseTimestamp: number;
}

interface SessionEndedMessage {
  type: 'session-ended';
  reason: 'session-switched';
  newPath?: string;
}

type DaemonMessage =
  | SessionJoinedMessage
  | UserJoinedMessage
  | UserLeftMessage
  | LeaderChangedMessage
  | HeartbeatResponseMessage
  | SessionEndedMessage;

function isDaemonMessage(data: unknown): data is DaemonMessage {
  if (typeof data !== 'object' || data === null) return false;
  const msg = data as { type?: string };
  return (
    msg.type === 'session-joined' ||
    msg.type === 'user-joined' ||
    msg.type === 'user-left' ||
    msg.type === 'leader-changed' ||
    msg.type === 'heartbeat-response' ||
    msg.type === 'session-ended'
  );
}

interface DaemonUser {
  id: string;
  username: string;
  isLeader: boolean;
}

interface DaemonState {
  isConnected: boolean;
  isConnecting: boolean;
  clientId: string | null;
  sessionId: string | null;
  users: DaemonUser[];
  isLeader: boolean;
  leaderId: string | null;
  error: string | null;
}

export interface DaemonContextType extends PeerContextType {
  isDaemonMode: boolean;
  daemonUsers: DaemonUser[];
  disconnect: () => void;
  connectionError: string | null;
}

export const DaemonContext = createContext<DaemonContextType | undefined>(undefined);

type DataHandler = {
  id: string;
  callback: (data: ReceivedPeerData) => void;
};

export const DaemonProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { daemonUrl } = useDaemonUrl();
  const pathname = usePathname();
  const { username } = useBoardProvider();

  const [state, setState] = useState<DaemonState>({
    isConnected: false,
    isConnecting: false,
    clientId: null,
    sessionId: null,
    users: [],
    isLeader: false,
    leaderId: null,
    error: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const dataHandlers = useRef<DataHandler[]>([]);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const hasJoinedSession = useRef(false);
  const lastHeartbeatResponse = useRef<number>(0);
  const connectionHealth = useRef<'HEALTHY' | 'DEGRADED' | 'POOR'>('HEALTHY');

  // Generate session ID from pathname
  const sessionId = pathname.replace(/\//g, '-').slice(1) || 'default';

  const subscribeToData = useCallback((callback: (data: ReceivedPeerData) => void) => {
    const handlerId = uuidv4();
    dataHandlers.current.push({ id: handlerId, callback });

    return () => {
      dataHandlers.current = dataHandlers.current.filter((handler) => handler.id !== handlerId);
    };
  }, []);

  const notifySubscribers = useCallback((data: ReceivedPeerData) => {
    dataHandlers.current.forEach((handler) => {
      try {
        handler.callback(data);
      } catch (error) {
        console.error('Error in daemon data handler:', error);
      }
    });
  }, []);

  const sendData = useCallback(
    (data: PeerData, _connectionId?: string | null) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        const message = {
          ...data,
          source: state.clientId || 'unknown',
          messageId: uuidv4(),
        };
        wsRef.current.send(JSON.stringify(message));
      } else {
        console.warn('Daemon WebSocket not connected, cannot send message:', data);
      }
    },
    [state.clientId],
  );

  const handleDaemonMessage = useCallback(
    (data: DaemonMessage) => {
      switch (data.type) {
        case 'session-joined':
          setState((prev) => ({
            ...prev,
            clientId: data.clientId,
            sessionId: data.sessionId,
            users: data.users,
            isLeader: data.isLeader,
            leaderId: data.users.find((u) => u.isLeader)?.id || null,
          }));

          // Notify queue context about initial data
          if (data.queue.length > 0 || data.currentClimbQueueItem) {
            notifySubscribers({
              type: 'initial-queue-data',
              queue: data.queue,
              currentClimbQueueItem: data.currentClimbQueueItem,
              source: 'daemon',
            });
          }
          break;

        case 'user-joined':
          setState((prev) => ({
            ...prev,
            users: [...prev.users.filter((u) => u.id !== data.user.id), data.user],
          }));
          break;

        case 'user-left':
          setState((prev) => ({
            ...prev,
            users: prev.users.filter((u) => u.id !== data.clientId),
          }));
          break;

        case 'leader-changed':
          setState((prev) => ({
            ...prev,
            leaderId: data.leaderId,
            isLeader: prev.clientId === data.leaderId,
            users: prev.users.map((u) => ({
              ...u,
              isLeader: u.id === data.leaderId,
            })),
          }));
          break;

        case 'heartbeat-response': {
          const latency = Date.now() - data.originalTimestamp;
          lastHeartbeatResponse.current = Date.now();
          // Update connection health based on latency
          if (latency < 200) {
            connectionHealth.current = 'HEALTHY';
          } else if (latency < 1000) {
            connectionHealth.current = 'DEGRADED';
          } else {
            connectionHealth.current = 'POOR';
          }
          break;
        }

        case 'session-ended':
          console.log('Session ended:', data.reason, 'New path:', data.newPath);
          // Reset state since our session was ended
          setState((prev) => ({
            ...prev,
            sessionId: null,
            users: [],
            isLeader: false,
            leaderId: null,
            error: `Session ended: ${data.reason}${data.newPath ? `. Navigate to ${data.newPath} to rejoin.` : ''}`,
          }));
          hasJoinedSession.current = false;
          break;
      }
    },
    [notifySubscribers],
  );

  const joinSession = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && !hasJoinedSession.current) {
      const joinMessage = {
        type: 'join-session',
        sessionId,
        boardPath: pathname,
        username: username || `User-${Date.now().toString(36)}`,
      };
      try {
        wsRef.current.send(JSON.stringify(joinMessage));
        // Only set flag after successful send
        hasJoinedSession.current = true;
      } catch (error) {
        console.error('Failed to send join-session message:', error);
        // Don't set flag so we can retry on next connection
      }
    }
  }, [sessionId, pathname, username]);

  const connect = useCallback(() => {
    if (!daemonUrl) return;

    setState((prev) => ({ ...prev, isConnecting: true, error: null }));

    try {
      // Close existing connection
      if (wsRef.current) {
        wsRef.current.close();
      }

      console.log('Connecting to BoardSesh Daemon:', daemonUrl);
      wsRef.current = new WebSocket(daemonUrl);

      wsRef.current.onopen = () => {
        console.log('Connected to BoardSesh Daemon');
        setState((prev) => ({ ...prev, isConnected: true, isConnecting: false }));
        reconnectAttempts.current = 0;
        hasJoinedSession.current = false;
        lastHeartbeatResponse.current = Date.now();
        connectionHealth.current = 'HEALTHY';

        // Join session after connection
        joinSession();

        // Start heartbeat interval (every 10 seconds)
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
        heartbeatIntervalRef.current = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(
              JSON.stringify({
                type: 'heartbeat',
                timestamp: Date.now(),
              }),
            );

            // Check if we haven't received a heartbeat response in 30 seconds
            const timeSinceLastResponse = Date.now() - lastHeartbeatResponse.current;
            if (timeSinceLastResponse > 30000) {
              console.warn('Daemon connection appears dead, reconnecting...');
              wsRef.current?.close(4000, 'Heartbeat timeout');
            }
          }
        }, 10000);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle daemon-specific messages
          if (isDaemonMessage(data)) {
            handleDaemonMessage(data);
            return;
          }

          // Validate and relay queue/peer messages to subscribers
          const dataWithSource = {
            ...data,
            source: data.source || 'daemon',
          };

          if (isPeerData(dataWithSource)) {
            notifySubscribers(dataWithSource);
          } else {
            console.warn('Received invalid peer data from daemon:', data.type);
          }
        } catch (error) {
          console.error('Error parsing daemon message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('Disconnected from BoardSesh Daemon:', event.code, event.reason);
        setState((prev) => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
          users: [],
        }));
        hasJoinedSession.current = false;

        // Attempt to reconnect unless it was a manual close
        if (event.code !== 1000 && reconnectAttempts.current < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          console.log(`Reconnecting to daemon in ${delay}ms...`);

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        }
      };

      wsRef.current.onerror = () => {
        console.error('BoardSesh Daemon WebSocket error');
        setState((prev) => ({
          ...prev,
          error: 'Failed to connect to daemon',
          isConnecting: false,
        }));
      };
    } catch (error) {
      console.error('Failed to connect to BoardSesh Daemon:', error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Connection failed',
        isConnecting: false,
      }));
    }
  }, [daemonUrl, joinSession, handleDaemonMessage, notifySubscribers]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (wsRef.current) {
      // Send leave message before closing
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'leave-session' }));
      }
      wsRef.current.close(1000, 'User disconnected');
    }
    setState({
      isConnected: false,
      isConnecting: false,
      clientId: null,
      sessionId: null,
      users: [],
      isLeader: false,
      leaderId: null,
      error: null,
    });
    hasJoinedSession.current = false;
  }, []);

  // Connect when daemon URL is available
  useEffect(() => {
    if (daemonUrl) {
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting');
      }
    };
  }, [daemonUrl, connect]);

  // Send username update when it changes
  useEffect(() => {
    if (state.isConnected && username && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'update-username',
          username,
        }),
      );
    }
  }, [username, state.isConnected]);

  // Convert daemon users to PeerConnection format for compatibility
  // Note: In daemon mode, we create minimal mock connections since we don't use PeerJS
  const connections: PeerConnection[] = state.users
    .filter((u) => u.id !== state.clientId)
    .map((user) => ({
      // Create a minimal mock DataConnection that satisfies the interface
      // This is intentional as daemon mode doesn't use PeerJS connections
      connection: { peer: user.id, open: true } as PeerConnection['connection'],
      username: user.username,
      state: 'CONNECTED' as const,
      isHost: user.isLeader,
      health: 'HEALTHY' as const,
      reconnectAttempts: 0,
    }));

  const contextValue: DaemonContextType = {
    // PeerContextType interface
    peerId: state.clientId,
    hostId: state.leaderId,
    isConnecting: state.isConnecting,
    hasConnected: state.isConnected,
    connections,
    currentLeader: state.leaderId,
    isLeader: state.isLeader,
    initiateLeaderElection: () => {}, // No-op, daemon handles this
    sendData,
    subscribeToData,
    connectToPeer: () => {}, // No-op in daemon mode

    // Daemon-specific
    isDaemonMode: true,
    daemonUsers: state.users,
    disconnect,
    connectionError: state.error,
  };

  return <DaemonContext.Provider value={contextValue}>{children}</DaemonContext.Provider>;
};

export const useDaemonContext = () => {
  const context = useContext(DaemonContext);
  if (!context) {
    throw new Error('useDaemonContext must be used within a DaemonProvider');
  }
  return context;
};
