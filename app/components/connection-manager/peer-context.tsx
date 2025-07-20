'use client';

import React, { useCallback, useContext, createContext, useEffect, useRef, useReducer } from 'react';
import { useSearchParams } from 'next/navigation';
import Peer, { DataConnection } from 'peerjs';
import {
  PeerContextType,
  PeerState,
  PeerAction,
  PeerData,
  PeerConnection,
  isPeerData,
  ReceivedPeerData,
} from './types';
import { v4 as uuidv4 } from 'uuid';
import { peerReducer, initialPeerState } from './reducer';

const PeerContext = createContext<PeerContextType | undefined>(undefined);
let peerInstance: Peer | undefined;
let heartbeatInterval: NodeJS.Timeout | undefined;
let healthCheckInterval: NodeJS.Timeout | undefined;

const HEARTBEAT_INTERVAL = 5000; // 5 seconds
const HEALTH_CHECK_INTERVAL = 2000; // 2 seconds
const CONNECTION_TIMEOUT = 15000; // 15 seconds
const MAX_RECONNECT_ATTEMPTS = 3;

type DataHandler = {
  id: string;
  callback: (data: ReceivedPeerData) => void;
};

const broadcastPeerList = (
  peerId: string,
  connections: PeerConnection[],
  sendData: (data: PeerData, connectionId: string | null) => void,
) => {
  const peerList = connections.map((conn) => conn.connection.peer);
  sendData(
    {
      type: 'broadcast-other-peers',
      peers: peerList,
    },
    peerId,
  );
};

// Deterministic leader election based on lexicographically smallest peer ID
const selectLeader = (peerIds: string[]): string | null => {
  if (peerIds.length === 0) return null;
  return peerIds.sort()[0];
};

// Get all connected peer IDs including self
const getAllPeerIds = (currentPeerId: string | null, connections: PeerConnection[]): string[] => {
  const connectedPeers = connections
    .filter(conn => conn.state === 'READY' || conn.state === 'CONNECTED')
    .map(conn => conn.connection.peer);
  
  if (currentPeerId) {
    return [currentPeerId, ...connectedPeers].sort();
  }
  return connectedPeers.sort();
};

// Calculate connection health based on latency and last heartbeat
const calculateConnectionHealth = (connection: PeerConnection): 'HEALTHY' | 'DEGRADED' | 'POOR' | 'DEAD' => {
  const now = Date.now();
  const timeSinceHeartbeat = connection.lastHeartbeat ? now - connection.lastHeartbeat : Infinity;
  
  if (timeSinceHeartbeat > CONNECTION_TIMEOUT) {
    return 'DEAD';
  }
  
  if (connection.latency) {
    if (connection.latency > 2000) return 'POOR';
    if (connection.latency > 1000) return 'DEGRADED';
  }
  
  if (timeSinceHeartbeat > HEARTBEAT_INTERVAL * 2) {
    return 'DEGRADED';
  }
  
  return 'HEALTHY';
};

export const PeerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(peerReducer, initialPeerState);
  const urlHostId = useSearchParams().get('hostId');
  const dataHandlers = useRef<DataHandler[]>([]);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

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
        console.error('Error in data handler:', error);
      }
    });
  }, []);

  const sendData = useCallback((data: PeerData, connectionId: string | null = null) => {
    const currentState = stateRef.current;
    const message = { ...data, source: currentState.peerId, messageId: uuidv4() };

    if (connectionId) {
      const connection = currentState.connections.find(
        ({ connection: conn }) => conn.peer === connectionId,
      )?.connection;

      if (connection) {
        connection.send(message);
      } else {
        console.error(`No active connection with ID ${connectionId}`);
      }
    } else {
      currentState.connections.forEach(({ connection }) => {
        console.log(`Sending to ${connection.peer}`, message);
        connection.send(message);
      });
    }
  }, []);

  // Leader election function
  const initiateLeaderElection = useCallback(() => {
    const currentState = stateRef.current;
    if (!currentState.peerId || currentState.leaderElectionInProgress) {
      return;
    }

    console.log('Initiating leader election');
    dispatch({ type: 'SET_LEADER_ELECTION_IN_PROGRESS', payload: true });

    const allPeerIds = getAllPeerIds(currentState.peerId, currentState.connections);
    const newLeader = selectLeader(allPeerIds);

    if (newLeader) {
      dispatch({ type: 'SET_LEADER', payload: newLeader });
      
      // Broadcast leader announcement
      sendData({
        type: 'leader-announcement',
        leaderId: newLeader,
        timestamp: Date.now(),
      });
    }
  }, [sendData]);

  // Heartbeat functions
  const sendHeartbeat = useCallback(() => {
    const currentState = stateRef.current;
    if (currentState.connections.length > 0) {
      sendData({
        type: 'heartbeat',
        timestamp: Date.now(),
      });
    }
  }, [sendData]);

  const startHeartbeat = useCallback(() => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }
    heartbeatInterval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
  }, [sendHeartbeat]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = undefined;
    }
  }, []);

  // Health check function
  const performHealthCheck = useCallback(() => {
    const currentState = stateRef.current;
    let needsLeaderElection = false;
    
    currentState.connections.forEach(connection => {
      const health = calculateConnectionHealth(connection);
      const previousHealth = connection.health;
      
      if (health !== previousHealth) {
        dispatch({
          type: 'UPDATE_CONNECTION_HEALTH',
          payload: { peerId: connection.connection.peer, health }
        });
        
        if (health === 'DEAD') {
          console.log(`Connection to ${connection.connection.peer} is dead, removing`);
          dispatch({ type: 'REMOVE_CONNECTION', payload: connection.connection.peer });
          
          // If the dead connection was the leader, trigger leader election
          if (connection.connection.peer === currentState.currentLeader) {
            needsLeaderElection = true;
          }
        }
      }
    });
    
    // If we lost the leader or have no leader, start election
    if (needsLeaderElection || (!currentState.currentLeader && currentState.connections.length > 0)) {
      initiateLeaderElection();
    }
  }, [initiateLeaderElection]);

  const startHealthCheck = useCallback(() => {
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval);
    }
    healthCheckInterval = setInterval(performHealthCheck, HEALTH_CHECK_INTERVAL);
  }, [performHealthCheck]);

  const stopHealthCheck = useCallback(() => {
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval);
      healthCheckInterval = undefined;
    }
  }, []);

  const connectToPeer = useCallback((connectionId: string, isHost?: boolean) => {
    console.log('Connecting to peer:', connectionId);
    const currentState = stateRef.current;

    if (!currentState.peer) {
      console.error('Peer not initialized');
      return;
    }

    if (connectionId === currentState.peerId) {
      console.log('Skipping self-connection');
      return;
    }

    // Instead of checking for existing connection, remove it if it exists
    const existingConnection = currentState.connections.find((conn) => conn.connection.peer === connectionId);
    if (existingConnection) {
      dispatch({
        type: 'REMOVE_CONNECTION',
        payload: connectionId,
      });
    }

    const newConn = currentState.peer.connect(connectionId);
    if (!newConn) {
      console.error('Failed to create connection');
      return;
    }

    console.log('Created new connection:', connectionId);
    dispatch({
      type: 'ADD_CONNECTION',
      payload: {
        connection: newConn,
        state: 'CONNECTING',
        isHost: existingConnection?.isHost || !!isHost,
        health: 'HEALTHY',
        reconnectAttempts: 0,
        lastHeartbeat: Date.now(),
      },
    });

    setupHandlers(newConn, dispatch, receivedDataRef, stateRef);
  }, []);

  // Enhanced connection failure handling with exponential backoff
  const handleConnectionFailure = useCallback((failedPeerId: string, failedConnection: PeerConnection | undefined, isPermanent: boolean) => {
    const currentState = stateRef.current;
    console.log(`Handling connection failure for ${failedPeerId}, permanent: ${isPermanent}`);
    
    // Remove the failed connection
    dispatch({
      type: 'REMOVE_CONNECTION',
      payload: failedPeerId,
    });
    
    // If this was the leader, trigger leader election
    let needsLeaderElection = false;
    if (failedPeerId === currentState.currentLeader) {
      needsLeaderElection = true;
    }
    
    // Attempt reconnection if not permanent failure
    if (!isPermanent && failedConnection) {
      const reconnectAttempts = failedConnection.reconnectAttempts || 0;
      
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        // Exponential backoff: 2^attempts seconds, up to 30 seconds
        const delay = Math.min(Math.pow(2, reconnectAttempts) * 1000, 30000);
        
        console.log(`Scheduling reconnection attempt ${reconnectAttempts + 1} for ${failedPeerId} in ${delay}ms`);
        
        setTimeout(() => {
          const latestState = stateRef.current;
          const stillNeedsReconnection = !latestState.connections.some(conn => conn.connection.peer === failedPeerId);
          
          if (stillNeedsReconnection) {
            console.log(`Reconnecting to ${failedPeerId} (attempt ${reconnectAttempts + 1})`);
            
            // Increment reconnect attempts before attempting
            dispatch({
              type: 'INCREMENT_RECONNECT_ATTEMPTS',
              payload: { peerId: failedPeerId }
            });
            
            connectToPeer(failedPeerId, failedConnection.isHost);
          }
        }, delay);
      } else {
        console.log(`Max reconnection attempts reached for ${failedPeerId}, giving up`);
      }
    }
    
    // Trigger leader election if needed
    if (needsLeaderElection) {
      setTimeout(() => {
        initiateLeaderElection();
      }, 1000);
    }
    
    // If we're the leader, coordinate reconnection with remaining peers
    if (currentState.isLeader && !isPermanent) {
      setTimeout(() => {
        const connectedPeers = stateRef.current.connections
          .filter(conn => conn.state === 'READY' || conn.state === 'CONNECTED')
          .map(conn => conn.connection.peer);
        
        if (connectedPeers.length > 0) {
          sendData({
            type: 'reconnect-coordination',
            targetPeers: [failedPeerId],
            initiatedBy: currentState.peerId || '',
          });
        }
      }, 2000);
    }
  }, [connectToPeer, initiateLeaderElection, sendData]);

  const receivedDataRef = useRef((data: ReceivedPeerData) => {
    const currentState = stateRef.current;

    switch (data.type) {
      case 'broadcast-other-peers':
        console.log('Received peer broadcast:', data.peers);
        if (Array.isArray(data.peers)) {
          data.peers.forEach((peerId) => {
            const hasConnection = currentState.connections.some((conn) => conn.connection.peer === peerId);
            if (!hasConnection && peerId !== currentState.peerId) {
              console.log('Connecting to new peer from broadcast:', peerId);
              connectToPeer(peerId);
            }
          });
        }
        break;
      case 'heartbeat':
        // Respond to heartbeat
        sendData({
          type: 'heartbeat-response',
          originalTimestamp: data.timestamp,
          responseTimestamp: Date.now(),
        }, data.source);
        
        // Update last heartbeat for this peer
        dispatch({
          type: 'UPDATE_LAST_HEARTBEAT',
          payload: { peerId: data.source, timestamp: Date.now() }
        });
        break;
      case 'heartbeat-response':
        // Calculate latency and update connection health
        const latency = Date.now() - data.originalTimestamp;
        dispatch({
          type: 'UPDATE_CONNECTION_HEALTH',
          payload: { 
            peerId: data.source, 
            health: latency > 2000 ? 'POOR' : latency > 1000 ? 'DEGRADED' : 'HEALTHY',
            latency 
          }
        });
        dispatch({
          type: 'UPDATE_LAST_HEARTBEAT',
          payload: { peerId: data.source, timestamp: Date.now() }
        });
        break;
      case 'leader-election':
        // Participate in leader election by comparing peer IDs
        const allPeers = getAllPeerIds(currentState.peerId, currentState.connections);
        const proposedLeader = selectLeader(allPeers);
        if (proposedLeader === currentState.peerId) {
          sendData({
            type: 'leader-announcement',
            leaderId: currentState.peerId,
            timestamp: Date.now(),
          });
        }
        break;
      case 'leader-announcement':
        // Accept the new leader
        console.log('New leader announced:', data.leaderId);
        dispatch({ type: 'SET_LEADER', payload: data.leaderId });
        break;
      case 'peer-list-sync':
        // Sync peer list from leader
        if (data.leaderId === currentState.currentLeader) {
          data.peers.forEach((peerId) => {
            const hasConnection = currentState.connections.some((conn) => conn.connection.peer === peerId);
            if (!hasConnection && peerId !== currentState.peerId) {
              console.log('Connecting to peer from leader sync:', peerId);
              connectToPeer(peerId);
            }
          });
        }
        break;
      case 'reconnect-coordination':
        // Leader-initiated reconnection
        if (data.initiatedBy === currentState.currentLeader) {
          data.targetPeers.forEach((peerId) => {
            if (peerId !== currentState.peerId) {
              const hasConnection = currentState.connections.some((conn) => conn.connection.peer === peerId);
              if (!hasConnection) {
                console.log('Reconnecting to peer by leader coordination:', peerId);
                connectToPeer(peerId);
              }
            }
          });
        }
        break;
      case 'new-connection':
      case 'request-update-queue':
      case 'update-queue':
      default:
        notifySubscribers(data);
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
        
        // Start heartbeat and health monitoring
        startHeartbeat();
        startHealthCheck();
        
        // Initial leader election for single peer
        setTimeout(() => {
          const currentState = stateRef.current;
          if (!currentState.currentLeader) {
            initiateLeaderElection();
          }
        }, 1000);
      });

      p.on('connection', (newConn: DataConnection) => {
        console.log('Receiving connection ', newConn.peer);
        setupHandlers(newConn, dispatch, receivedDataRef, stateRef);
      });

      p.on('error', (error) => {
        console.error('Peer error:', error);
        const failedPeerId = error.message.replace('Could not connect to peer ', '').trim();
        const currentState = stateRef.current;
        const failedConnection = currentState.connections.find((conn) => conn.connection.peer === failedPeerId);

        switch (error.type) {
          case 'disconnected':
          case 'socket-closed':
            handleConnectionFailure(failedPeerId, failedConnection, false);
            break;

          case 'peer-unavailable':
            handleConnectionFailure(failedPeerId, failedConnection, true);
            break;

          default:
            console.error(`Unhandled connection error with peer ${failedPeerId}:`, error);
            handleConnectionFailure(failedPeerId, failedConnection, true);
        }
      });

      dispatch({ type: 'SET_PEER', payload: p });
    }
  });

  useEffect(() => {
    state.connections
      .filter((con) => con && con.state === 'CONNECTED')
      .forEach((conn) => {
        const peerId = conn.connection.peer;

        // Only send broadcast and notify if this connection hasn't been processed
        if (conn.state === 'CONNECTED') {
          // First, broadcast peer list
          broadcastPeerList(peerId, state.connections, sendData);

          // Then notify subscribers about the new connection
          notifySubscribers({
            type: 'new-connection',
            source: peerId,
          });

          // Update connection state to READY
          dispatch({
            type: 'UPDATE_CONNECTION_STATE',
            payload: { peerId, state: 'READY' },
          });

          // If we're the leader, send peer list sync to the new connection
          if (state.isLeader) {
            const allPeers = getAllPeerIds(state.peerId, state.connections);
            sendData({
              type: 'peer-list-sync',
              peers: allPeers,
              leaderId: state.peerId || '',
            }, peerId);
          }

          // Trigger leader election if we don't have a leader yet
          if (!state.currentLeader) {
            setTimeout(() => initiateLeaderElection(), 500);
          }
        }
      });
  }, [state.connections, state.isLeader, state.peerId, state.currentLeader, sendData, notifySubscribers, initiateLeaderElection]);

  useEffect(() => {
    if (state.readyToConnect && urlHostId) {
      const connectionExists = state.connections.some((conn) => conn.connection.peer === urlHostId);
      if (!connectionExists) {
        try {
          connectToPeer(urlHostId, true);
          // Remove the hostId search param
          const url = new URL(window.location.href);
          url.searchParams.delete('hostId');
          window.history.replaceState(null, '', url);
        } catch {
          // Fallback error handling
          const url = new URL(window.location.href);
          url.searchParams.delete('hostId');
          window.history.replaceState(null, '', url);
        }
      }
    }
  }, [state.readyToConnect, urlHostId, connectToPeer, state.connections]);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      stopHeartbeat();
      stopHealthCheck();
    };
  }, [stopHeartbeat, stopHealthCheck]);

  const contextValue: PeerContextType = {
    peerId: state.peerId,
    connections: state.connections,
    sendData,
    connectToPeer,
    subscribeToData,
    hostId: state.connections.find((conn) => conn.isHost)?.connection?.peer || urlHostId,
    isConnecting:
      !state.peerId || (state.connections.length > 0 && state.connections.some((conn) => conn.state === 'READY')),
    hasConnected: state.connections.length > 0 && state.connections.some((conn) => conn.state === 'READY'),
    currentLeader: state.currentLeader,
    isLeader: state.isLeader,
    initiateLeaderElection,
  };

  return <PeerContext.Provider value={contextValue}>{children}</PeerContext.Provider>;
};

function setupHandlers(
  conn: DataConnection & { _handlersSetup?: boolean },
  dispatch: React.Dispatch<PeerAction>,
  receivedDataRef: React.MutableRefObject<(data: ReceivedPeerData) => void>,
  stateRef: React.MutableRefObject<PeerState>,
) {
  if (conn._handlersSetup) {
    console.log('Handlers already setup for:', conn.peer);
    return;
  }

  console.log('Setting up listeners for', conn.peer);
  conn._handlersSetup = true;

  setupDataHandlers(conn, receivedDataRef, dispatch, stateRef);

  if (!conn.open) {
    conn.on('open', () => {
      console.log(`Connection opened with peer ${conn.peer}`);
      dispatch({
        type: 'ADD_CONNECTION',
        payload: { 
          connection: conn, 
          state: 'CONNECTED',
          health: 'HEALTHY',
          reconnectAttempts: 0,
          lastHeartbeat: Date.now()
        } as PeerConnection,
      });
      
      // Reset reconnect attempts on successful connection
      dispatch({
        type: 'RESET_RECONNECT_ATTEMPTS',
        payload: { peerId: conn.peer }
      });
    });
  } else {
    dispatch({
      type: 'ADD_CONNECTION',
      payload: { 
        connection: conn, 
        state: 'CONNECTED',
        health: 'HEALTHY',
        reconnectAttempts: 0,
        lastHeartbeat: Date.now()
      } as PeerConnection,
    });
    
    // Reset reconnect attempts on successful connection
    dispatch({
      type: 'RESET_RECONNECT_ATTEMPTS',
      payload: { peerId: conn.peer }
    });
  }
}

function setupDataHandlers(
  conn: DataConnection,
  receivedDataRef: React.MutableRefObject<(data: ReceivedPeerData) => void>,
  dispatch: React.Dispatch<PeerAction>,
  stateRef: React.MutableRefObject<PeerState>,
) {
  conn.on('data', ((data: unknown) => {
    console.log('Received data from peer:', conn.peer, data);

    if (isPeerData(data)) {
      receivedDataRef.current(data);
    } else {
      console.error('Received invalid data format:', data);
    }
  }) as (data: unknown) => void);

  conn.on('close', () => {
    console.log(`Connection closed with peer ${conn.peer}`);
    dispatch({
      type: 'UPDATE_CONNECTIONS',
      payload: stateRef.current.connections.filter(({ connection }) => connection.peer !== conn.peer),
    });
  });

  conn.on('error', (err) => {
    console.error(`Error with peer ${conn.peer}:`, err);
  });
}

export const usePeerData = (callback: (data: PeerData) => void) => {
  const { subscribeToData } = usePeerContext();

  useEffect(() => {
    const unsubscribe = subscribeToData(callback);
    return () => unsubscribe();
  }, [callback, subscribeToData]);
};

export const usePeerContext = () => {
  const context = useContext(PeerContext);
  if (!context) {
    throw new Error('usePeerContext must be used within a PeerProvider');
  }
  return context;
};

export default PeerProvider;
