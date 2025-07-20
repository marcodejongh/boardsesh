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
  provider: {} as unknown,
  serialization: 'json',
  reliable: true,
  label: 'data',
  type: 'data'
} as unknown as DataConnection);

// Helper to create a proper mock PeerConnection with all required fields
const createMockPeerConnection = (
  peer: string, 
  state: PeerConnection['state'] = 'CONNECTING',
  isHost: boolean = false
): PeerConnection => ({
  connection: createMockDataConnection(peer),
  state,
  isHost,
  health: 'HEALTHY',
  reconnectAttempts: 0,
  lastHeartbeat: Date.now()
});

const mockPeerConnection: PeerConnection = {
  connection: createMockDataConnection('test-peer'),
  state: 'CONNECTING',
  isHost: false,
  health: 'HEALTHY',
  reconnectAttempts: 0,
  lastHeartbeat: Date.now()
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
} as unknown;

describe('peerReducer', () => {
  describe('initialPeerState', () => {
    it('should have correct initial state', () => {
      expect(initialPeerState).toEqual({
        peer: null,
        peerId: null,
        connections: [],
        readyToConnect: false,
        currentLeader: null,
        isLeader: false,
        leaderElectionInProgress: false
      });
    });
  });

  describe('SET_PEER', () => {
    it('should set the peer instance', () => {
      const action: PeerAction = {
        type: 'SET_PEER',
        payload: mockPeer as any
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
      const existingConnection: PeerConnection = createMockPeerConnection('existing-peer', 'CONNECTED', true);

      const stateWithConnections: PeerState = {
        ...initialPeerState,
        connections: [existingConnection]
      };

      const newConnections: PeerConnection[] = [
        createMockPeerConnection('new-peer-1', 'CONNECTING', false),
        createMockPeerConnection('new-peer-2', 'READY', true)
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
      const firstConnection: PeerConnection = createMockPeerConnection('peer-1', 'CONNECTING', false);

      const stateWithFirstConnection: PeerState = {
        ...initialPeerState,
        connections: [firstConnection]
      };

      const secondConnection: PeerConnection = createMockPeerConnection('peer-2', 'CONNECTED', true);

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
      const existingConnection: PeerConnection = createMockPeerConnection('existing-peer', 'CONNECTED', false);

      const stateWithConnection: PeerState = {
        ...initialPeerState,
        connections: [existingConnection]
      };

      const duplicateConnection: PeerConnection = createMockPeerConnection('existing-peer', 'READY', true);

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
      const connection1: PeerConnection = createMockPeerConnection('peer-1', 'CONNECTED', false);
      const connection2: PeerConnection = createMockPeerConnection('peer-2', 'READY', true);

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
        isHost: false,
        health: 'HEALTHY',
        reconnectAttempts: 0
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
      const connection1: PeerConnection = createMockPeerConnection('peer-1', 'CONNECTING', false);
      const connection2: PeerConnection = createMockPeerConnection('peer-2', 'CONNECTED', true);

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

  describe('UPDATE_CONNECTION_HEALTH', () => {
    it('should update connection health and latency', () => {
      const stateWithConnection: PeerState = {
        ...initialPeerState,
        connections: [mockPeerConnection]
      };

      const action: PeerAction = {
        type: 'UPDATE_CONNECTION_HEALTH',
        payload: {
          peerId: 'test-peer',
          health: 'DEGRADED',
          latency: 1500
        }
      };

      const result = peerReducer(stateWithConnection, action);

      expect(result.connections[0].health).toBe('DEGRADED');
      expect(result.connections[0].latency).toBe(1500);
    });

    it('should update health without changing latency if not provided', () => {
      const stateWithConnection: PeerState = {
        ...initialPeerState,
        connections: [{
          ...mockPeerConnection,
          latency: 500
        }]
      };

      const action: PeerAction = {
        type: 'UPDATE_CONNECTION_HEALTH',
        payload: {
          peerId: 'test-peer',
          health: 'POOR'
        }
      };

      const result = peerReducer(stateWithConnection, action);

      expect(result.connections[0].health).toBe('POOR');
      expect(result.connections[0].latency).toBe(500);
    });
  });

  describe('UPDATE_LAST_HEARTBEAT', () => {
    it('should update last heartbeat timestamp', () => {
      const stateWithConnection: PeerState = {
        ...initialPeerState,
        connections: [mockPeerConnection]
      };

      const timestamp = Date.now();
      const action: PeerAction = {
        type: 'UPDATE_LAST_HEARTBEAT',
        payload: {
          peerId: 'test-peer',
          timestamp
        }
      };

      const result = peerReducer(stateWithConnection, action);

      expect(result.connections[0].lastHeartbeat).toBe(timestamp);
    });
  });

  describe('INCREMENT_RECONNECT_ATTEMPTS', () => {
    it('should increment reconnect attempts for a connection', () => {
      const stateWithConnection: PeerState = {
        ...initialPeerState,
        connections: [{
          ...mockPeerConnection,
          reconnectAttempts: 1
        }]
      };

      const action: PeerAction = {
        type: 'INCREMENT_RECONNECT_ATTEMPTS',
        payload: {
          peerId: 'test-peer'
        }
      };

      const result = peerReducer(stateWithConnection, action);

      expect(result.connections[0].reconnectAttempts).toBe(2);
    });
  });

  describe('RESET_RECONNECT_ATTEMPTS', () => {
    it('should reset reconnect attempts to 0', () => {
      const stateWithConnection: PeerState = {
        ...initialPeerState,
        connections: [{
          ...mockPeerConnection,
          reconnectAttempts: 3
        }]
      };

      const action: PeerAction = {
        type: 'RESET_RECONNECT_ATTEMPTS',
        payload: {
          peerId: 'test-peer'
        }
      };

      const result = peerReducer(stateWithConnection, action);

      expect(result.connections[0].reconnectAttempts).toBe(0);
    });
  });

  describe('SET_LEADER', () => {
    it('should set current leader and update isLeader when peerId matches', () => {
      const state: PeerState = {
        ...initialPeerState,
        peerId: 'my-peer-id',
        leaderElectionInProgress: true
      };

      const action: PeerAction = {
        type: 'SET_LEADER',
        payload: 'my-peer-id'
      };

      const result = peerReducer(state, action);

      expect(result.currentLeader).toBe('my-peer-id');
      expect(result.isLeader).toBe(true);
      expect(result.leaderElectionInProgress).toBe(false);
    });

    it('should set current leader and isLeader to false when peerId does not match', () => {
      const state: PeerState = {
        ...initialPeerState,
        peerId: 'my-peer-id',
        leaderElectionInProgress: true
      };

      const action: PeerAction = {
        type: 'SET_LEADER',
        payload: 'other-peer-id'
      };

      const result = peerReducer(state, action);

      expect(result.currentLeader).toBe('other-peer-id');
      expect(result.isLeader).toBe(false);
      expect(result.leaderElectionInProgress).toBe(false);
    });
  });

  describe('SET_IS_LEADER', () => {
    it('should set isLeader flag', () => {
      const action: PeerAction = {
        type: 'SET_IS_LEADER',
        payload: true
      };

      const result = peerReducer(initialPeerState, action);

      expect(result.isLeader).toBe(true);
    });
  });

  describe('SET_LEADER_ELECTION_IN_PROGRESS', () => {
    it('should set leaderElectionInProgress flag', () => {
      const action: PeerAction = {
        type: 'SET_LEADER_ELECTION_IN_PROGRESS',
        payload: true
      };

      const result = peerReducer(initialPeerState, action);

      expect(result.leaderElectionInProgress).toBe(true);
    });
  });

  describe('unknown action', () => {
    it('should return unchanged state for unknown action', () => {
      const unknownAction = { type: 'UNKNOWN_ACTION', payload: null } as unknown as PeerAction;

      const result = peerReducer(initialPeerState, unknownAction);

      expect(result).toEqual(initialPeerState);
    });
  });
});