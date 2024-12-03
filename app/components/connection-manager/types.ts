import Peer, { DataConnection } from 'peerjs';
import { ClimbQueue, ClimbQueueItem, PeerId } from '../queue-control/types';

// export type PeerData = {
//   type: string;
//   data: object;
// };
export type SendData = (data: object) => void;
export type ConnectionInitialiser = (sendData: SendData) => void;

// // Type for the Peer Context
// export type PeerContextType = {
//   readyToConnect: boolean;
//   receivedData: PeerData | null;
//   sendData: (data: PeerData, connectionId?: string | null) => void;
//   connectToPeer: (connectionId: string) => void;
//   peerId: string | null;
//   hostId: string | null;
//   addConnectionInitialiser: (connectionInitialiser: ConnectionInitialiser) => void;
//   connections: DataConnection[];
//   setReceivedData: object | null;
// };

// Type for the PeerProvider Props
export type PeerProviderProps = {
  children: React.ReactNode;
};

// State type for the connections array
export type PeerConnectionState = DataConnection[]; // Array of PeerJS DataConnection objects

export type PeerConnection = {
  connection: DataConnection;
  username?: string;
  state: 'CONNECTING' | 'CONNECTED';
};

export interface PeerState {
  peer: Peer | null;
  peerId: PeerId;
  connections: PeerConnection[];
  readyToConnect: boolean;
}

export interface PeerData {
  type: 'request-update-queue' | 'update-queue';
  queue?: ClimbQueue;
  currentClimbQueueItem?: ClimbQueueItem | null;
  source?: string;
  messageId?: string;
}

export type PeerAction =
  | { type: 'SET_PEER'; payload: Peer }
  | { type: 'SET_PEER_ID'; payload: string }
  | { type: 'SET_READY_TO_CONNECT'; payload: boolean }
  | { type: 'OPENED_CONNECTION'; payload: string }
  | { type: 'UPDATE_CONNECTIONS'; payload: PeerConnection[] };

export interface PeerContextType {
  peerId: PeerId;
  connections: DataConnection[];
  sendData: (data: PeerData, destinationPeerId?: string | null) => void;
  connectToPeer: (connectionId: string) => void;
  setQueueUpdateHandler: (handler: (data: PeerData) => void) => void;
}