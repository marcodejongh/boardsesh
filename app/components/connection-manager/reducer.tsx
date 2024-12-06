'use client';
import { PeerState, PeerAction, ConnectionState } from './types';

export const initialPeerState: PeerState = {
  peer: null,
  peerId: null,
  connections: [],
  readyToConnect: false,
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
    case 'ADD_CONNECTION':
      if (state.connections.some((conn) => conn.connection.peer === action.payload.connection.peer)) {
        return state;
      }
      return { ...state, connections: [...state.connections, action.payload] };
    case 'UPDATE_CONNECTION_STATE':
      return {
        ...state,
        connections: state.connections.map((conn) =>
          conn.connection.peer === action.payload.peerId
            ? { ...conn, state: action.payload.state as ConnectionState }
            : conn,
        ),
      };
    default:
      return state;
  }
}
