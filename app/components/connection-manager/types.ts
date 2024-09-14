import { DataConnection, Peer } from "peerjs";

// Type for the Peer Context
export type PeerContextType = {
  readyToConnect: boolean;
  receivedData: any; // You can adjust this based on what kind of data is received
  sendData: (data: any, connectionId?: string | null) => void;
  connectToPeer: (connectionId: string) => void;
  peerId: string | null;
};

// Type for the PeerProvider Props
export type PeerProviderProps = {
  children: React.ReactNode;
};

// State type for the connections array
export type PeerConnectionState = DataConnection[]; // Array of PeerJS DataConnection objects
