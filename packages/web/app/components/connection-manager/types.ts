import Peer, { DataConnection } from 'peerjs';
import { ClimbQueue, ClimbQueueItem, PeerId } from '../queue-control/types';

export type ConnectionState = 'CONNECTING' | 'CONNECTED' | 'READY' | 'BROADCAST_SENT' | 'UNHEALTHY' | 'RECONNECTING';
export type ConnectionHealth = 'HEALTHY' | 'DEGRADED' | 'POOR' | 'DEAD';

export type PeerConnection = {
  connection: DataConnection;
  username?: string;
  state: ConnectionState;
  isHost?: boolean;
  health: ConnectionHealth;
  lastHeartbeat?: number;
  latency?: number;
  reconnectAttempts: number;
};

export interface PeerState {
  peer: Peer | null;
  peerId: PeerId;
  connections: PeerConnection[];
  readyToConnect: boolean;
  currentLeader: PeerId;
  isLeader: boolean;
  leaderElectionInProgress: boolean;
}

export type PeerAction =
  | { type: 'SET_PEER'; payload: Peer }
  | { type: 'SET_PEER_ID'; payload: string }
  | { type: 'SET_READY_TO_CONNECT'; payload: boolean }
  | { type: 'UPDATE_CONNECTIONS'; payload: PeerConnection[] }
  | { type: 'ADD_CONNECTION'; payload: PeerConnection }
  | { type: 'UPDATE_CONNECTION_STATE'; payload: { peerId: string; state: ConnectionState } }
  | { type: 'UPDATE_CONNECTION_HEALTH'; payload: { peerId: string; health: ConnectionHealth; latency?: number } }
  | { type: 'UPDATE_LAST_HEARTBEAT'; payload: { peerId: string; timestamp: number } }
  | { type: 'INCREMENT_RECONNECT_ATTEMPTS'; payload: { peerId: string } }
  | { type: 'RESET_RECONNECT_ATTEMPTS'; payload: { peerId: string } }
  | { type: 'REMOVE_CONNECTION'; payload: PeerId }
  | { type: 'SET_LEADER'; payload: PeerId }
  | { type: 'SET_IS_LEADER'; payload: boolean }
  | { type: 'SET_LEADER_ELECTION_IN_PROGRESS'; payload: boolean }
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
  currentLeader: PeerId;
  isLeader: boolean;
  initiateLeaderElection: () => void;
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

// Delta message types for efficient synchronization
interface AddQueueItemData {
  type: 'add-queue-item';
  item: ClimbQueueItem;
  position?: number; // If not provided, add to end
}

interface RemoveQueueItemData {
  type: 'remove-queue-item';
  uuid: string;
}

interface ReorderQueueItemData {
  type: 'reorder-queue-item';
  uuid: string;
  oldIndex: number;
  newIndex: number;
}

interface UpdateCurrentClimbData {
  type: 'update-current-climb';
  item: ClimbQueueItem | null;
  shouldAddToQueue?: boolean; // Whether to add item to queue if not present
}

interface MirrorCurrentClimbData {
  type: 'mirror-current-climb';
  mirrored: boolean;
}

interface ReplaceQueueItemData {
  type: 'replace-queue-item';
  uuid: string;
  item: ClimbQueueItem;
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

interface HeartbeatData {
  type: 'heartbeat';
  timestamp: number;
}

interface HeartbeatResponseData {
  type: 'heartbeat-response';
  originalTimestamp: number;
  responseTimestamp: number;
}

interface LeaderElectionData {
  type: 'leader-election';
  candidateId: string;
  timestamp: number;
}

interface LeaderAnnouncementData {
  type: 'leader-announcement';
  leaderId: string;
  timestamp: number;
}

interface PeerListSyncData {
  type: 'peer-list-sync';
  peers: string[];
  leaderId: string;
}

interface ReconnectCoordinationData {
  type: 'reconnect-coordination';
  targetPeers: string[];
  initiatedBy: string;
}

// Union type of all possible message types
export type PeerData =
  | RequestUpdateQueueData
  | UpdateQueueData
  | BroadcastOtherPeersData
  | NewConnectionData
  | SendPeerInfo
  | AddQueueItemData
  | RemoveQueueItemData
  | ReorderQueueItemData
  | UpdateCurrentClimbData
  | MirrorCurrentClimbData
  | ReplaceQueueItemData
  | HeartbeatData
  | HeartbeatResponseData
  | LeaderElectionData
  | LeaderAnnouncementData
  | PeerListSyncData
  | ReconnectCoordinationData;
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
    case 'new-connection':
      return true; // No additional required fields
    case 'send-peer-info':
      return !!msg.username;
    case 'initial-queue-data':
    case 'update-queue':
      return 'queue' in msg && 'currentClimbQueueItem' in msg;
    case 'broadcast-other-peers':
      return Array.isArray(msg.peers);
    case 'add-queue-item':
      return 'item' in msg && typeof msg.item === 'object';
    case 'remove-queue-item':
      return 'uuid' in msg && typeof msg.uuid === 'string';
    case 'reorder-queue-item':
      return 'uuid' in msg && 'oldIndex' in msg && 'newIndex' in msg &&
             typeof msg.uuid === 'string' && typeof msg.oldIndex === 'number' && typeof msg.newIndex === 'number';
    case 'update-current-climb':
      return 'item' in msg; // item can be null
    case 'mirror-current-climb':
      return 'mirrored' in msg && typeof msg.mirrored === 'boolean';
    case 'replace-queue-item':
      return 'uuid' in msg && 'item' in msg && typeof msg.uuid === 'string' && typeof msg.item === 'object';
    case 'heartbeat':
      return typeof msg.timestamp === 'number';
    case 'heartbeat-response':
      return typeof msg.originalTimestamp === 'number' && typeof msg.responseTimestamp === 'number';
    case 'leader-election':
      return !!msg.candidateId && typeof msg.timestamp === 'number';
    case 'leader-announcement':
      return !!msg.leaderId && typeof msg.timestamp === 'number';
    case 'peer-list-sync':
      return Array.isArray(msg.peers) && !!msg.leaderId;
    case 'reconnect-coordination':
      return Array.isArray(msg.targetPeers) && !!msg.initiatedBy;
    default:
      return false;
  }
}
