import Peer, { DataConnection } from 'peerjs';
import { ClimbQueue, ClimbQueueItem, PeerId } from '../queue-control/types';

export type ConnectionState = 'CONNECTING' | 'CONNECTED' | 'READY' | 'BROADCAST_SENT';

export type PeerConnection = {
  connection: DataConnection;
  username?: string;
  state: ConnectionState;
  isHost?: boolean;
};

export interface PeerState {
  peer: Peer | null;
  peerId: PeerId;
  connections: PeerConnection[];
  readyToConnect: boolean;
}

export type PeerAction =
  | { type: 'SET_PEER'; payload: Peer }
  | { type: 'SET_PEER_ID'; payload: string }
  | { type: 'SET_READY_TO_CONNECT'; payload: boolean }
  | { type: 'UPDATE_CONNECTIONS'; payload: PeerConnection[] }
  | { type: 'ADD_CONNECTION'; payload: PeerConnection }
  | { type: 'UPDATE_CONNECTION_STATE'; payload: { peerId: string; state: ConnectionState } }
  | { type: 'REMOVE_CONNECTION'; payload: PeerId }
  | { type: 'OPENED_CONNECTION'; payload: string };

export interface PeerContextType {
  peerId: PeerId;
  hostId: PeerId;
  connections: PeerConnection[];
  sendData: (data: PeerData, connectionId?: string | null) => void;
  connectToPeer: (connectionId: string) => void;
  subscribeToData: (callback: (data: ReceivedPeerData) => void) => () => void;
  isConnecting: boolean;
  hasConnected: boolean;
}

export type PeerProviderProps = {
  children: React.ReactNode;
};

// Base interface for common properties all messages should have
interface PeerDataBase {
  source: string;
  messageId?: string;
}

// Specific message types
interface RequestUpdateQueueData {
  type: 'request-update-queue';
}

interface UpdateQueueData {
  type: 'update-queue' | 'initial-queue-data';
  queue: ClimbQueue;
  currentClimbQueueItem: ClimbQueueItem | null;
}

interface BroadcastOtherPeersData {
  type: 'broadcast-other-peers';
  peers: string[];
}

interface NewConnectionData {
  type: 'new-connection';
  source: string;
}

export interface SendPeerInfo {
  type: 'send-peer-info';
  username: string;
}

// Union type of all possible message types
export type PeerData =
  | RequestUpdateQueueData
  | UpdateQueueData
  | BroadcastOtherPeersData
  | NewConnectionData
  | SendPeerInfo;
export type ReceivedPeerData = PeerData & PeerDataBase;
export function isPeerData(data: unknown): data is ReceivedPeerData {
  if (typeof data !== 'object' || data === null) return false;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const msg = data as any;

  // Check for required base properties
  if (!('type' in msg)) return false;

  // Validate based on type
  switch (msg.type) {
    case 'request-update-queue':
      return true; // No additional required fields
    case 'send-peer-info':
      return !!msg.username;
    case 'initial-queue-data':
    case 'update-queue':
      return 'queue' in msg && 'currentClimbQueueItem' in msg;

    case 'broadcast-other-peers':
      return Array.isArray(msg.peers);

    default:
      return false;
  }
}
