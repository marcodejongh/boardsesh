import { describe, it, expect, vi } from 'vitest';
import { peerReducer, initialPeerState } from '../reducer';
import { PeerState, PeerAction, PeerConnection } from '../types';
import { DataConnection } from 'peerjs';

// Mock DataConnection
const createMockDataConnection = (peer: string): DataConnection => ({
  peer,
  send: vi.fn(),
  close: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  open: true,
  metadata: {},
  connectionId: `conn-${peer}`,
  dataChannel: {} as RTCDataChannel,
  peerConnection: {} as RTCPeerConnection,
  provider: {} as any,
  serialization: 'json',
  reliable: true,
  label: 'data',
  type: 'data'
} as DataConnection);

const mockPeerConnection: PeerConnection = {
  connection: createMockDataConnection('test-peer'),
  state: 'CONNECTING',
  isHost: false
};

const mockPeer = {
  id: 'test-peer-id',
  connect: vi.fn(),
  disconnect: vi.fn(),
  destroy: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  options: {},
  open: true,
  connections: {},
  disconnected: false,
  destroyed: false
} as any;

describe('peerReducer', () => {
  describe('initialPeerState', () => {
    it('should have correct initial state', () => {
      expect(initialPeerState).toEqual({
        peer: null,
        peerId: null,
        connections: [],
        readyToConnect: false
      });
    });
  });

  describe('SET_PEER', () => {
    it('should set the peer instance', () => {
      const action: PeerAction = {
        type: 'SET_PEER',
        payload: mockPeer
      };

      const result = peerReducer(initialPeerState, action);

      expect(result.peer).toBe(mockPeer);
      expect(result.peerId).toBeNull();
      expect(result.connections).toEqual([]);
      expect(result.readyToConnect).toBe(false);
    });
  });

  describe('SET_PEER_ID', () => {
    it('should set the peer ID', () => {
      const action: PeerAction = {
        type: 'SET_PEER_ID',
        payload: 'new-peer-id'
      };

      const result = peerReducer(initialPeerState, action);

      expect(result.peerId).toBe('new-peer-id');
      expect(result.peer).toBeNull();
      expect(result.connections).toEqual([]);
      expect(result.readyToConnect).toBe(false);
    });
  });

  describe('SET_READY_TO_CONNECT', () => {
    it('should set readyToConnect to true', () => {
      const action: PeerAction = {
        type: 'SET_READY_TO_CONNECT',
        payload: true
      };

      const result = peerReducer(initialPeerState, action);

      expect(result.readyToConnect).toBe(true);
      expect(result.peer).toBeNull();
      expect(result.peerId).toBeNull();
      expect(result.connections).toEqual([]);
    });

    it('should set readyToConnect to false', () => {
      const stateWithReady: PeerState = {
        ...initialPeerState,
        readyToConnect: true
      };

      const action: PeerAction = {
        type: 'SET_READY_TO_CONNECT',
        payload: false
      };

      const result = peerReducer(stateWithReady, action);

      expect(result.readyToConnect).toBe(false);
    });
  });

  describe('UPDATE_CONNECTIONS', () => {
    it('should replace all connections', () => {
      const existingConnection: PeerConnection = {
        connection: createMockDataConnection('existing-peer'),
        state: 'CONNECTED',
        isHost: true
      };

      const stateWithConnections: PeerState = {
        ...initialPeerState,
        connections: [existingConnection]
      };

      const newConnections: PeerConnection[] = [
        {
          connection: createMockDataConnection('new-peer-1'),
          state: 'CONNECTING',
          isHost: false
        },
        {
          connection: createMockDataConnection('new-peer-2'),
          state: 'READY',
          isHost: true
        }
      ];

      const action: PeerAction = {
        type: 'UPDATE_CONNECTIONS',
        payload: newConnections
      };

      const result = peerReducer(stateWithConnections, action);

      expect(result.connections).toEqual(newConnections);
      expect(result.connections).toHaveLength(2);
    });

    it('should handle empty connections array', () => {
      const stateWithConnections: PeerState = {
        ...initialPeerState,
        connections: [mockPeerConnection]
      };

      const action: PeerAction = {
        type: 'UPDATE_CONNECTIONS',
        payload: []
      };

      const result = peerReducer(stateWithConnections, action);

      expect(result.connections).toEqual([]);
    });
  });

  describe('ADD_CONNECTION', () => {
    it('should add a new connection', () => {
      const action: PeerAction = {
        type: 'ADD_CONNECTION',
        payload: mockPeerConnection
      };

      const result = peerReducer(initialPeerState, action);

      expect(result.connections).toHaveLength(1);
      expect(result.connections[0]).toEqual(mockPeerConnection);
    });

    it('should add multiple connections', () => {
      const firstConnection: PeerConnection = {
        connection: createMockDataConnection('peer-1'),
        state: 'CONNECTING',
        isHost: false
      };

      const stateWithFirstConnection: PeerState = {
        ...initialPeerState,
        connections: [firstConnection]
      };

      const secondConnection: PeerConnection = {
        connection: createMockDataConnection('peer-2'),
        state: 'CONNECTED',
        isHost: true
      };

      const action: PeerAction = {
        type: 'ADD_CONNECTION',
        payload: secondConnection
      };

      const result = peerReducer(stateWithFirstConnection, action);

      expect(result.connections).toHaveLength(2);
      expect(result.connections[0]).toEqual(firstConnection);
      expect(result.connections[1]).toEqual(secondConnection);
    });

    it('should not add duplicate connections', () => {
      const existingConnection: PeerConnection = {
        connection: createMockDataConnection('existing-peer'),
        state: 'CONNECTED',
        isHost: false
      };

      const stateWithConnection: PeerState = {
        ...initialPeerState,
        connections: [existingConnection]
      };

      const duplicateConnection: PeerConnection = {
        connection: createMockDataConnection('existing-peer'),
        state: 'READY',
        isHost: true
      };

      const action: PeerAction = {
        type: 'ADD_CONNECTION',
        payload: duplicateConnection
      };

      const result = peerReducer(stateWithConnection, action);

      expect(result.connections).toHaveLength(1);
      expect(result.connections[0]).toEqual(existingConnection);
    });
  });

  describe('REMOVE_CONNECTION', () => {
    it('should remove connection by peer ID', () => {
      const connection1: PeerConnection = {
        connection: createMockDataConnection('peer-1'),
        state: 'CONNECTED',
        isHost: false
      };

      const connection2: PeerConnection = {
        connection: createMockDataConnection('peer-2'),
        state: 'READY',
        isHost: true
      };

      const stateWithConnections: PeerState = {
        ...initialPeerState,
        connections: [connection1, connection2]
      };

      const action: PeerAction = {
        type: 'REMOVE_CONNECTION',
        payload: 'peer-1'
      };

      const result = peerReducer(stateWithConnections, action);

      expect(result.connections).toHaveLength(1);
      expect(result.connections[0]).toEqual(connection2);
    });

    it('should handle removing non-existent connection', () => {
      const stateWithConnections: PeerState = {
        ...initialPeerState,
        connections: [mockPeerConnection]
      };

      const action: PeerAction = {
        type: 'REMOVE_CONNECTION',
        payload: 'non-existent-peer'
      };

      const result = peerReducer(stateWithConnections, action);

      expect(result.connections).toHaveLength(1);
      expect(result.connections[0]).toEqual(mockPeerConnection);
    });

    it('should handle removing from empty connections', () => {
      const action: PeerAction = {
        type: 'REMOVE_CONNECTION',
        payload: 'any-peer'
      };

      const result = peerReducer(initialPeerState, action);

      expect(result.connections).toEqual([]);
    });
  });

  describe('UPDATE_CONNECTION_STATE', () => {
    it('should update connection state for matching peer', () => {
      const connection: PeerConnection = {
        connection: createMockDataConnection('target-peer'),
        state: 'CONNECTING',
        isHost: false
      };

      const stateWithConnection: PeerState = {
        ...initialPeerState,
        connections: [connection]
      };

      const action: PeerAction = {
        type: 'UPDATE_CONNECTION_STATE',
        payload: {
          peerId: 'target-peer',
          state: 'READY'
        }
      };

      const result = peerReducer(stateWithConnection, action);

      expect(result.connections).toHaveLength(1);
      expect(result.connections[0].state).toBe('READY');
      expect(result.connections[0].connection.peer).toBe('target-peer');
      expect(result.connections[0].isHost).toBe(false);
    });

    it('should not update state for non-matching peer', () => {
      const connection1: PeerConnection = {
        connection: createMockDataConnection('peer-1'),
        state: 'CONNECTING',
        isHost: false
      };

      const connection2: PeerConnection = {
        connection: createMockDataConnection('peer-2'),
        state: 'CONNECTED',
        isHost: true
      };

      const stateWithConnections: PeerState = {
        ...initialPeerState,
        connections: [connection1, connection2]
      };

      const action: PeerAction = {
        type: 'UPDATE_CONNECTION_STATE',
        payload: {
          peerId: 'peer-1',
          state: 'READY'
        }
      };

      const result = peerReducer(stateWithConnections, action);

      expect(result.connections).toHaveLength(2);
      expect(result.connections[0].state).toBe('READY');
      expect(result.connections[1].state).toBe('CONNECTED');
    });

    it('should handle updating state for non-existent peer', () => {
      const stateWithConnection: PeerState = {
        ...initialPeerState,
        connections: [mockPeerConnection]
      };

      const action: PeerAction = {
        type: 'UPDATE_CONNECTION_STATE',
        payload: {
          peerId: 'non-existent-peer',
          state: 'READY'
        }
      };

      const result = peerReducer(stateWithConnection, action);

      expect(result.connections).toHaveLength(1);
      expect(result.connections[0]).toEqual(mockPeerConnection);
    });
  });

  describe('unknown action', () => {
    it('should return unchanged state for unknown action', () => {
      const unknownAction = { type: 'UNKNOWN_ACTION' } as any;

      const result = peerReducer(initialPeerState, unknownAction);

      expect(result).toEqual(initialPeerState);
    });
  });
});