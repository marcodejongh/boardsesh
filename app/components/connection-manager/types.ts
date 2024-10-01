import { DataConnection } from 'peerjs';

export type PeerData = {
  type: string;
  data: object;
};
// Type for the Peer Context
export type PeerContextType = {
  readyToConnect: boolean;
  receivedData: PeerData | null;
  sendData: (data: PeerData, connectionId?: string | null) => void;
  connectToPeer: (connectionId: string) => void;
  peerId: string | null;
};

// Type for the PeerProvider Props
export type PeerProviderProps = {
  children: React.ReactNode;
};

// State type for the connections array
export type PeerConnectionState = DataConnection[]; // Array of PeerJS DataConnection objects
