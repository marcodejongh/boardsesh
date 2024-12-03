import Peer, { DataConnection } from 'peerjs';
import { ClimbQueue, ClimbQueueItem, PeerId } from '../queue-control/types';

export type ConnectionState = 'CONNECTING' | 'CONNECTED' | 'READY';

export type PeerConnection = {
  connection: DataConnection;
  username?: string;
  state: ConnectionState;
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
  | { type: 'OPENED_CONNECTION'; payload: string };

export interface PeerContextType {
  peerId: PeerId;
  connections: PeerConnection[];
  sendData: (data: PeerData, connectionId?: string | null) => void;
  connectToPeer: (connectionId: string) => void;
  subscribeToData: (callback: (data: PeerData) => void) => () => void;
}

export type PeerProviderProps = {
  children: React.ReactNode;
};

// Base interface for common properties all messages should have
interface PeerDataBase {
  source?: string;
  messageId?: string;
}

// Specific message types
interface RequestUpdateQueueData extends PeerDataBase {
  type: 'request-update-queue';
}

interface UpdateQueueData extends PeerDataBase {
  type: 'update-queue';
  queue: ClimbQueue;
  currentClimbQueueItem: ClimbQueueItem | null;
}

interface BroadcastOtherPeersData extends PeerDataBase {
  type: 'broadcast-other-peers';
  peers: string[];
}

// Union type of all possible message types
export type PeerData = RequestUpdateQueueData | UpdateQueueData | BroadcastOtherPeersData;

export function isPeerData(data: unknown): data is PeerData {
  if (typeof data !== 'object' || data === null) return false;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const msg = data as any;

  // Check for required base properties
  if (!('type' in msg)) return false;

  // Validate based on type
  switch (msg.type) {
    case 'request-update-queue':
      return true; // No additional required fields

    case 'update-queue':
      return 'queue' in msg && 'currentClimbQueueItem' in msg;

    case 'broadcast-other-peers':
      return Array.isArray(msg.peers);

    default:
      return false;
  }
}
