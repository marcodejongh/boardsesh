'use client';
import { PeerState, PeerAction, ConnectionState } from './types';

export const initialPeerState: PeerState = {
  peer: null,
  peerId: null,
  connections: [],
  readyToConnect: false,
  currentLeader: null,
  isLeader: false,
  leaderElectionInProgress: false,
};
export function peerReducer(state: PeerState, action: PeerAction): PeerState {
  switch (action.type) {
    case 'SET_PEER':
      return { ...state, peer: action.payload };
    case 'SET_PEER_ID':
      return { ...state, peerId: action.payload };
    case 'SET_READY_TO_CONNECT':
      return { ...state, readyToConnect: action.payload };
    case 'UPDATE_CONNECTIONS':
      return { ...state, connections: action.payload };
    case 'REMOVE_CONNECTION':
      return { ...state, connections: state.connections.filter((conn) => conn.connection.peer !== action.payload) };
    case 'ADD_CONNECTION':
      if (state.connections.some((conn) => conn.connection.peer === action.payload.connection.peer)) {
        return state;
      }
      const newConnection = {
        ...action.payload,
        health: action.payload.health || 'HEALTHY',
        reconnectAttempts: action.payload.reconnectAttempts || 0,
      };
      return { ...state, connections: [...state.connections, newConnection] };
    case 'UPDATE_CONNECTION_STATE':
      return {
        ...state,
        connections: state.connections.map((conn) =>
          conn.connection.peer === action.payload.peerId
            ? { ...conn, state: action.payload.state as ConnectionState }
            : conn,
        ),
      };
    case 'UPDATE_CONNECTION_HEALTH':
      return {
        ...state,
        connections: state.connections.map((conn) =>
          conn.connection.peer === action.payload.peerId
            ? { 
                ...conn, 
                health: action.payload.health,
                latency: action.payload.latency !== undefined ? action.payload.latency : conn.latency 
              }
            : conn,
        ),
      };
    case 'UPDATE_LAST_HEARTBEAT':
      return {
        ...state,
        connections: state.connections.map((conn) =>
          conn.connection.peer === action.payload.peerId
            ? { ...conn, lastHeartbeat: action.payload.timestamp }
            : conn,
        ),
      };
    case 'INCREMENT_RECONNECT_ATTEMPTS':
      return {
        ...state,
        connections: state.connections.map((conn) =>
          conn.connection.peer === action.payload.peerId
            ? { ...conn, reconnectAttempts: conn.reconnectAttempts + 1 }
            : conn,
        ),
      };
    case 'RESET_RECONNECT_ATTEMPTS':
      return {
        ...state,
        connections: state.connections.map((conn) =>
          conn.connection.peer === action.payload.peerId
            ? { ...conn, reconnectAttempts: 0 }
            : conn,
        ),
      };
    case 'SET_LEADER':
      return { 
        ...state, 
        currentLeader: action.payload,
        isLeader: action.payload === state.peerId,
        leaderElectionInProgress: false 
      };
    case 'SET_IS_LEADER':
      return { ...state, isLeader: action.payload };
    case 'SET_LEADER_ELECTION_IN_PROGRESS':
      return { ...state, leaderElectionInProgress: action.payload };
    default:
      return state;
  }
}
