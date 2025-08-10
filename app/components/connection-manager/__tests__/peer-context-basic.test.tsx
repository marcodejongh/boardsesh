import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { PeerProvider, usePeerContext } from '../peer-context';

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

// Simple mock for PeerJS
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

describe('PeerContext Basic Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
});