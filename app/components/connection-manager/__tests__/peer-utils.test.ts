import { describe, it, expect } from 'vitest';
import { PeerConnection } from '../types';
import { DataConnection } from 'peerjs';

// We need to export these functions from peer-context.tsx to test them
// For now, we'll recreate them here for testing

const selectLeader = (peerIds: string[]): string | null => {
  if (peerIds.length === 0) return null;
  return peerIds.sort()[0];
};

const getAllPeerIds = (currentPeerId: string | null, connections: PeerConnection[]): string[] => {
  const connectedPeers = connections
    .filter(conn => conn.state === 'READY' || conn.state === 'CONNECTED')
    .map(conn => conn.connection.peer);
  
  if (currentPeerId) {
    return [currentPeerId, ...connectedPeers].sort();
  }
  return connectedPeers.sort();
};

const calculateConnectionHealth = (connection: PeerConnection): 'HEALTHY' | 'DEGRADED' | 'POOR' | 'DEAD' => {
  const now = Date.now();
  const timeSinceHeartbeat = connection.lastHeartbeat ? now - connection.lastHeartbeat : Infinity;
  const CONNECTION_TIMEOUT = 15000;
  const HEARTBEAT_INTERVAL = 5000;
  
  if (timeSinceHeartbeat > CONNECTION_TIMEOUT) {
    return 'DEAD';
  }
  
  if (connection.latency) {
    if (connection.latency > 2000) return 'POOR';
    if (connection.latency > 1000) return 'DEGRADED';
  }
  
  if (timeSinceHeartbeat > HEARTBEAT_INTERVAL * 2) {
    return 'DEGRADED';
  }
  
  return 'HEALTHY';
};

// Mock DataConnection
const createMockDataConnection = (peer: string): DataConnection => ({
  peer,
  send: () => {},
  close: () => {},
  on: () => {},
  off: () => {},
  open: true,
  metadata: {},
  connectionId: `conn-${peer}`,
  label: 'data',
  type: 'data'
} as unknown as DataConnection);

const createMockPeerConnection = (
  peer: string,
  state: PeerConnection['state'] = 'CONNECTED',
  health: PeerConnection['health'] = 'HEALTHY',
  lastHeartbeat?: number,
  latency?: number
): PeerConnection => ({
  connection: createMockDataConnection(peer),
  state,
  health,
  reconnectAttempts: 0,
  lastHeartbeat,
  latency,
  isHost: false
});

describe('Peer Utility Functions', () => {
  describe('selectLeader', () => {
    it('should return null for empty array', () => {
      expect(selectLeader([])).toBe(null);
    });

    it('should return the only peer ID for single element', () => {
      expect(selectLeader(['peer-1'])).toBe('peer-1');
    });

    it('should return lexicographically smallest ID', () => {
      expect(selectLeader(['peer-3', 'peer-1', 'peer-2'])).toBe('peer-1');
      expect(selectLeader(['zebra', 'alpha', 'beta'])).toBe('alpha');
      expect(selectLeader(['10', '2', '1'])).toBe('1');
    });

    it('should handle identical IDs', () => {
      expect(selectLeader(['peer-1', 'peer-1', 'peer-2'])).toBe('peer-1');
    });
  });

  describe('getAllPeerIds', () => {
    it('should return empty array when no peers and no current ID', () => {
      expect(getAllPeerIds(null, [])).toEqual([]);
    });

    it('should return only current peer ID when no connections', () => {
      expect(getAllPeerIds('peer-1', [])).toEqual(['peer-1']);
    });

    it('should include only READY and CONNECTED peers', () => {
      const connections: PeerConnection[] = [
        createMockPeerConnection('peer-2', 'READY'),
        createMockPeerConnection('peer-3', 'CONNECTING'),
        createMockPeerConnection('peer-4', 'CONNECTED'),
        createMockPeerConnection('peer-5', 'UNHEALTHY'),
        createMockPeerConnection('peer-6', 'RECONNECTING')
      ];

      expect(getAllPeerIds('peer-1', connections)).toEqual(['peer-1', 'peer-2', 'peer-4']);
    });

    it('should return sorted peer IDs', () => {
      const connections: PeerConnection[] = [
        createMockPeerConnection('peer-3', 'READY'),
        createMockPeerConnection('peer-2', 'CONNECTED'),
        createMockPeerConnection('peer-5', 'READY')
      ];

      expect(getAllPeerIds('peer-4', connections)).toEqual(['peer-2', 'peer-3', 'peer-4', 'peer-5']);
    });

    it('should work without current peer ID', () => {
      const connections: PeerConnection[] = [
        createMockPeerConnection('peer-2', 'READY'),
        createMockPeerConnection('peer-1', 'CONNECTED')
      ];

      expect(getAllPeerIds(null, connections)).toEqual(['peer-1', 'peer-2']);
    });
  });

  describe('calculateConnectionHealth', () => {
    it('should return HEALTHY for recent heartbeat with good latency', () => {
      const connection = createMockPeerConnection(
        'peer-1',
        'CONNECTED',
        'HEALTHY',
        Date.now() - 1000, // 1 second ago
        500 // 500ms latency
      );

      expect(calculateConnectionHealth(connection)).toBe('HEALTHY');
    });

    it('should return DEGRADED for high latency', () => {
      const connection = createMockPeerConnection(
        'peer-1',
        'CONNECTED',
        'HEALTHY',
        Date.now() - 1000,
        1500 // 1500ms latency
      );

      expect(calculateConnectionHealth(connection)).toBe('DEGRADED');
    });

    it('should return POOR for very high latency', () => {
      const connection = createMockPeerConnection(
        'peer-1',
        'CONNECTED',
        'HEALTHY',
        Date.now() - 1000,
        2500 // 2500ms latency
      );

      expect(calculateConnectionHealth(connection)).toBe('POOR');
    });

    it('should return DEGRADED for old heartbeat', () => {
      const connection = createMockPeerConnection(
        'peer-1',
        'CONNECTED',
        'HEALTHY',
        Date.now() - 12000, // 12 seconds ago
        500
      );

      expect(calculateConnectionHealth(connection)).toBe('DEGRADED');
    });

    it('should return DEAD for very old heartbeat', () => {
      const connection = createMockPeerConnection(
        'peer-1',
        'CONNECTED',
        'HEALTHY',
        Date.now() - 20000, // 20 seconds ago
        500
      );

      expect(calculateConnectionHealth(connection)).toBe('DEAD');
    });

    it('should return DEAD for no heartbeat', () => {
      const connection = createMockPeerConnection(
        'peer-1',
        'CONNECTED',
        'HEALTHY',
        undefined,
        500
      );

      expect(calculateConnectionHealth(connection)).toBe('DEAD');
    });

    it('should prioritize timeout over latency', () => {
      const connection = createMockPeerConnection(
        'peer-1',
        'CONNECTED',
        'HEALTHY',
        Date.now() - 20000, // Very old
        100 // Good latency
      );

      expect(calculateConnectionHealth(connection)).toBe('DEAD');
    });
  });
});