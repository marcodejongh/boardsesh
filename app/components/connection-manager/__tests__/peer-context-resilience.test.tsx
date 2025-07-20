import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { PeerProvider, usePeerContext } from '../peer-context';
import { DataConnection } from 'peerjs';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(() => ({
    get: vi.fn(() => null)
  }))
}));

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-123')
}));

// Mock PeerJS
const mockPeerInstance = {
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
};

const mockDataConnection = (peerId: string): Partial<DataConnection> => ({
  peer: peerId,
  send: vi.fn(),
  close: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  open: true,
  metadata: {},
  connectionId: `conn-${peerId}`,
  label: 'data',
  type: 'data'
});

vi.mock('peerjs', () => {
  return {
    default: vi.fn(() => mockPeerInstance)
  };
});

describe('PeerContext Resilience Tests', () => {
  let openCallback: ((id: string) => void) | undefined;
  let connectionCallback: ((conn: DataConnection) => void) | undefined;
  let errorCallback: ((error: Record<string, unknown>) => void) | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Capture callbacks
    mockPeerInstance.on.mockImplementation((event: string, cb: (data?: unknown) => void) => {
      if (event === 'open') openCallback = cb;
      if (event === 'connection') connectionCallback = cb;
      if (event === 'error') errorCallback = cb;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Leader Election', () => {
    it('should elect self as leader when alone', async () => {
      const { result } = renderHook(() => usePeerContext(), {
        wrapper: ({ children }) => <PeerProvider>{children}</PeerProvider>
      });

      // Simulate peer opening
      act(() => {
        openCallback?.('peer-1');
      });

      // Wait for leader election timeout
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(result.current.currentLeader).toBe('peer-1');
        expect(result.current.isLeader).toBe(true);
      });
    });

    it('should elect leader based on lexicographically smallest ID', async () => {
      const { result } = renderHook(() => usePeerContext(), {
        wrapper: ({ children }) => <PeerProvider>{children}</PeerProvider>
      });

      // Simulate peer opening with ID 'peer-2'
      act(() => {
        openCallback?.('peer-2');
      });

      // Simulate incoming connection from 'peer-1'
      const mockConn = mockDataConnection('peer-1') as DataConnection;
      let dataHandler: ((data: Record<string, unknown>) => void) | undefined;
      
      mockConn.on = vi.fn().mockImplementation((event: string, cb: (data?: unknown) => void) => {
        if (event === 'data') dataHandler = cb;
        if (event === 'open') {
          cb();
        }
      });

      act(() => {
        connectionCallback?.(mockConn);
      });

      // Simulate leader announcement from peer-1
      act(() => {
        dataHandler?.({
          type: 'leader-announcement',
          leaderId: 'peer-1',
          timestamp: Date.now(),
          source: 'peer-1'
        });
      });

      await waitFor(() => {
        expect(result.current.currentLeader).toBe('peer-1');
        expect(result.current.isLeader).toBe(false);
      });
    });

    it('should re-elect leader when current leader disconnects', async () => {
      const { result } = renderHook(() => usePeerContext(), {
        wrapper: ({ children }) => <PeerProvider>{children}</PeerProvider>
      });

      // Setup initial state with peer-2 as self and peer-1 as leader
      act(() => {
        openCallback?.('peer-2');
      });

      const mockConn = mockDataConnection('peer-1') as DataConnection;
      let closeHandler: (() => void) | undefined;
      
      mockConn.on = vi.fn().mockImplementation((event: string, cb: (data?: unknown) => void) => {
        if (event === 'close') closeHandler = cb;
        if (event === 'open') cb();
      });

      act(() => {
        connectionCallback?.(mockConn);
      });

      // Set peer-1 as leader
      act(() => {
        result.current.initiateLeaderElection();
      });

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Simulate peer-1 disconnecting
      act(() => {
        closeHandler?.();
      });

      // Advance timers for health check to detect dead connection
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(result.current.currentLeader).toBe('peer-2');
        expect(result.current.isLeader).toBe(true);
      });
    });
  });

  describe('Heartbeat System', () => {
    it('should send heartbeats at regular intervals', async () => {
      const { result } = renderHook(() => usePeerContext(), {
        wrapper: ({ children }) => <PeerProvider>{children}</PeerProvider>
      });

      // Setup peer with connection
      act(() => {
        openCallback?.('peer-1');
      });

      const mockConn = mockDataConnection('peer-2') as DataConnection;
      mockConn.on = vi.fn().mockImplementation((event: string, cb: (data?: unknown) => void) => {
        if (event === 'open') cb();
      });

      act(() => {
        connectionCallback?.(mockConn);
      });

      // Wait for connection to be ready
      await waitFor(() => {
        expect(result.current.connections.length).toBe(1);
      });

      // Clear previous calls
      mockConn.send = vi.fn();

      // Advance time to trigger heartbeat
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(mockConn.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'heartbeat',
          timestamp: expect.any(Number),
          source: 'peer-1',
          messageId: 'test-uuid-123'
        })
      );
    });

    it('should update connection health based on heartbeat responses', async () => {
      const { result } = renderHook(() => usePeerContext(), {
        wrapper: ({ children }) => <PeerProvider>{children}</PeerProvider>
      });

      act(() => {
        openCallback?.('peer-1');
      });

      const mockConn = mockDataConnection('peer-2') as DataConnection;
      let dataHandler: ((data: Record<string, unknown>) => void) | undefined;
      
      mockConn.on = vi.fn().mockImplementation((event: string, cb: (data?: unknown) => void) => {
        if (event === 'data') dataHandler = cb;
        if (event === 'open') cb();
      });

      act(() => {
        connectionCallback?.(mockConn);
      });

      // Simulate heartbeat response with good latency
      const originalTimestamp = Date.now() - 100; // 100ms ago
      act(() => {
        dataHandler?.({
          type: 'heartbeat-response',
          originalTimestamp,
          responseTimestamp: Date.now(),
          source: 'peer-2'
        });
      });

      await waitFor(() => {
        const connection = result.current.connections.find(c => c.connection.peer === 'peer-2');
        expect(connection?.health).toBe('HEALTHY');
        expect(connection?.latency).toBeLessThan(200);
      });
    });

    it('should mark connection as dead after timeout', async () => {
      const { result } = renderHook(() => usePeerContext(), {
        wrapper: ({ children }) => <PeerProvider>{children}</PeerProvider>
      });

      act(() => {
        openCallback?.('peer-1');
      });

      const mockConn = mockDataConnection('peer-2') as DataConnection;
      mockConn.on = vi.fn().mockImplementation((event: string, cb: (data?: unknown) => void) => {
        if (event === 'open') cb();
      });

      act(() => {
        connectionCallback?.(mockConn);
      });

      // Wait for connection to establish
      await waitFor(() => {
        expect(result.current.connections.length).toBe(1);
      });

      // Advance time beyond connection timeout (15 seconds)
      act(() => {
        vi.advanceTimersByTime(20000);
      });

      await waitFor(() => {
        expect(result.current.connections.length).toBe(0);
      });
    });
  });

  describe('Reconnection Logic', () => {
    it('should attempt reconnection with exponential backoff', async () => {
      renderHook(() => usePeerContext(), {
        wrapper: ({ children }) => <PeerProvider>{children}</PeerProvider>
      });

      act(() => {
        openCallback?.('peer-1');
      });

      // Clear connect mock
      mockPeerInstance.connect.mockClear();

      // Simulate connection error
      act(() => {
        errorCallback?.({
          type: 'disconnected',
          message: 'Could not connect to peer peer-2'
        });
      });

      // First reconnection attempt after 1 second
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(mockPeerInstance.connect).toHaveBeenCalledTimes(1);
      expect(mockPeerInstance.connect).toHaveBeenCalledWith('peer-2');

      // Simulate another failure
      mockPeerInstance.connect.mockClear();
      act(() => {
        errorCallback?.({
          type: 'disconnected',
          message: 'Could not connect to peer peer-2'
        });
      });

      // Second reconnection attempt after 2 seconds (exponential backoff)
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(mockPeerInstance.connect).toHaveBeenCalledTimes(1);
    });

    it('should stop reconnection attempts after max retries', async () => {
      renderHook(() => usePeerContext(), {
        wrapper: ({ children }) => <PeerProvider>{children}</PeerProvider>
      });

      act(() => {
        openCallback?.('peer-1');
      });

      // Setup initial connection that will fail
      const mockConn = mockDataConnection('peer-2') as DataConnection;
      mockConn.on = vi.fn().mockImplementation((event: string, cb: (data?: unknown) => void) => {
        if (event === 'open') cb();
      });

      act(() => {
        connectionCallback?.(mockConn);
      });

      // Simulate 3 consecutive failures (max attempts)
      for (let i = 0; i < 3; i++) {
        mockPeerInstance.connect.mockClear();
        
        act(() => {
          errorCallback?.({
            type: 'disconnected',
            message: 'Could not connect to peer peer-2'
          });
        });

        // Advance time for reconnection
        act(() => {
          vi.advanceTimersByTime(Math.pow(2, i) * 1000);
        });
      }

      // Simulate one more failure
      mockPeerInstance.connect.mockClear();
      act(() => {
        errorCallback?.({
          type: 'disconnected',
          message: 'Could not connect to peer peer-2'
        });
      });

      // Advance time significantly
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      // Should not attempt to reconnect anymore
      expect(mockPeerInstance.connect).not.toHaveBeenCalled();
    });
  });

  describe('Leader-Coordinated Recovery', () => {
    it('should coordinate reconnection when leader detects peer failure', async () => {
      const { result } = renderHook(() => usePeerContext(), {
        wrapper: ({ children }) => <PeerProvider>{children}</PeerProvider>
      });

      // Setup as leader with multiple peers
      act(() => {
        openCallback?.('peer-1'); // This will be the leader (smallest ID)
      });

      // Add peer-2
      const mockConn2 = mockDataConnection('peer-2') as DataConnection;
      mockConn2.on = vi.fn().mockImplementation((event: string, cb: (data?: unknown) => void) => {
        if (event === 'open') cb();
      });

      act(() => {
        connectionCallback?.(mockConn2);
      });

      // Add peer-3
      const mockConn3 = mockDataConnection('peer-3') as DataConnection;
      mockConn3.on = vi.fn().mockImplementation((event: string, cb: (data?: unknown) => void) => {
        if (event === 'open') cb();
      });

      act(() => {
        connectionCallback?.(mockConn3);
      });

      // Wait for connections and leader election
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(result.current.isLeader).toBe(true);
        expect(result.current.connections.length).toBe(2);
      });

      // Clear send mocks
      mockConn2.send = vi.fn();
      mockConn3.send = vi.fn();

      // Simulate peer-2 disconnecting
      act(() => {
        errorCallback?.({
          type: 'disconnected',
          message: 'Could not connect to peer peer-2'
        });
      });

      // Advance time for leader to coordinate
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // Leader should send reconnect coordination to remaining peers
      expect(mockConn3.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'reconnect-coordination',
          targetPeers: ['peer-2'],
          initiatedBy: 'peer-1'
        })
      );
    });
  });
});