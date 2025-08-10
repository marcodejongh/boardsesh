import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { PeerProvider, usePeerContext } from '../peer-context';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(() => ({
    get: vi.fn(() => undefined)
  }))
}));

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-123')
}));

// Simple mock for PeerJS that doesn't trigger complex behaviors
vi.mock('peerjs', () => {
  const mockPeer = {
    id: null,
    connect: vi.fn(),
    disconnect: vi.fn(),
    destroy: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    open: false
  };
  
  return {
    default: vi.fn(() => mockPeer)
  };
});

describe('PeerContext Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should provide initial context values', () => {
      const { result } = renderHook(() => usePeerContext(), {
        wrapper: ({ children }) => <PeerProvider>{children}</PeerProvider>
      });

      expect(result.current.peerId).toBeNull();
      expect(result.current.connections).toEqual([]);
      expect(result.current.currentLeader).toBeNull();
      expect(result.current.isLeader).toBe(false);
      expect(typeof result.current.sendData).toBe('function');
      expect(typeof result.current.connectToPeer).toBe('function');
      expect(typeof result.current.subscribeToData).toBe('function');
      expect(typeof result.current.initiateLeaderElection).toBe('function');
    });

    it('should handle data subscription', () => {
      const { result } = renderHook(() => usePeerContext(), {
        wrapper: ({ children }) => <PeerProvider>{children}</PeerProvider>
      });

      const mockCallback = vi.fn();
      const unsubscribe = result.current.subscribeToData(mockCallback);
      
      expect(typeof unsubscribe).toBe('function');
      expect(() => unsubscribe()).not.toThrow();
    });

    it('should not throw when calling methods with no connections', () => {
      const { result } = renderHook(() => usePeerContext(), {
        wrapper: ({ children }) => <PeerProvider>{children}</PeerProvider>
      });

      expect(() => result.current.sendData({ type: 'request-update-queue' })).not.toThrow();
      expect(() => result.current.connectToPeer('peer-123')).not.toThrow();
      expect(() => result.current.initiateLeaderElection()).not.toThrow();
    });
  });

  describe('Connection State Management', () => {
    it('should provide connection status properties', () => {
      const { result } = renderHook(() => usePeerContext(), {
        wrapper: ({ children }) => <PeerProvider>{children}</PeerProvider>
      });

      expect(typeof result.current.isConnecting).toBe('boolean');
      expect(typeof result.current.hasConnected).toBe('boolean');
      expect(result.current.hostId).toBeUndefined();
    });
  });

  describe('Error Resilience', () => {
    it('should handle context provider being unmounted gracefully', () => {
      const { result, unmount } = renderHook(() => usePeerContext(), {
        wrapper: ({ children }) => <PeerProvider>{children}</PeerProvider>
      });

      expect(result.current.peerId).toBeNull();
      expect(() => unmount()).not.toThrow();
    });

    it('should handle multiple rapid subscription/unsubscription', () => {
      const { result } = renderHook(() => usePeerContext(), {
        wrapper: ({ children }) => <PeerProvider>{children}</PeerProvider>
      });

      const callbacks = Array.from({ length: 10 }, () => vi.fn());
      const unsubscribers = callbacks.map(callback => 
        result.current.subscribeToData(callback)
      );

      // Should not throw when unsubscribing all
      expect(() => {
        unsubscribers.forEach(unsubscribe => unsubscribe());
      }).not.toThrow();
    });
  });
});