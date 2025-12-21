import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { useSearchParams } from 'next/navigation';
import { PeerProvider, usePeerContext } from '../peer-context';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn()
}));

// Using class for Vitest 4.x compatibility
vi.mock('peerjs', () => {
  return {
    default: class MockPeer {
      id = 'test-peer-id';
      connect = vi.fn();
      disconnect = vi.fn();
      destroy = vi.fn();
      on = vi.fn();
      off = vi.fn();
      options = {};
      open = true;
      connections = {};
      disconnected = false;
      destroyed = false;
    }
  };
});

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-123')
}));

Object.defineProperty(window, 'history', {
  value: {
    replaceState: vi.fn()
  },
  writable: true
});

const mockSearchParams = {
  get: vi.fn()
};

const TestComponent = () => {
  const context = usePeerContext();
  
  return (
    <div>
      <div data-testid="peer-id">{context.peerId || 'null'}</div>
      <div data-testid="host-id">{context.hostId || 'null'}</div>
      <div data-testid="connections-count">{context.connections.length}</div>
      <div data-testid="is-connecting">{context.isConnecting ? 'true' : 'false'}</div>
      <div data-testid="has-connected">{context.hasConnected ? 'true' : 'false'}</div>
    </div>
  );
};

describe('PeerProvider Basic Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(mockSearchParams);
    mockSearchParams.get.mockReturnValue(null);
  });

  it('should provide peer context to children', () => {
    render(
      <PeerProvider>
        <TestComponent />
      </PeerProvider>
    );

    expect(screen.getByTestId('peer-id')).toHaveTextContent('null');
    expect(screen.getByTestId('connections-count')).toHaveTextContent('0');
    expect(screen.getByTestId('is-connecting')).toHaveTextContent('true');
    expect(screen.getByTestId('has-connected')).toHaveTextContent('false');
  });

  it('should handle hostId from URL params', () => {
    mockSearchParams.get.mockImplementation((key: string) => {
      if (key === 'hostId') return 'url-host-id';
      return null;
    });

    render(
      <PeerProvider>
        <TestComponent />
      </PeerProvider>
    );

    expect(screen.getByTestId('host-id')).toHaveTextContent('url-host-id');
  });

  it('should throw error when usePeerContext is used outside provider', () => {
    const TestComponentOutsideProvider = () => {
      usePeerContext();
      return <div>Test</div>;
    };

    expect(() => {
      render(<TestComponentOutsideProvider />);
    }).toThrow('usePeerContext must be used within a PeerProvider');
  });

  it('should have sendData function available', () => {
    const TestComponentWithFunctions = () => {
      const context = usePeerContext();
      
      return (
        <div>
          <div data-testid="has-send-data">
            {typeof context.sendData === 'function' ? 'true' : 'false'}
          </div>
          <div data-testid="has-connect-to-peer">
            {typeof context.connectToPeer === 'function' ? 'true' : 'false'}
          </div>
          <div data-testid="has-subscribe-to-data">
            {typeof context.subscribeToData === 'function' ? 'true' : 'false'}
          </div>
        </div>
      );
    };

    render(
      <PeerProvider>
        <TestComponentWithFunctions />
      </PeerProvider>
    );

    expect(screen.getByTestId('has-send-data')).toHaveTextContent('true');
    expect(screen.getByTestId('has-connect-to-peer')).toHaveTextContent('true');
    expect(screen.getByTestId('has-subscribe-to-data')).toHaveTextContent('true');
  });

  it('should handle subscribeToData and return unsubscribe function', () => {
    const TestComponentWithSubscription = () => {
      const context = usePeerContext();
      const [subscribed, setSubscribed] = React.useState(false);
      
      React.useEffect(() => {
        const unsubscribe = context.subscribeToData(() => {
          // Mock callback
        });
        
        setSubscribed(true);
        
        return () => {
          unsubscribe();
        };
      }, [context]);
      
      return (
        <div data-testid="subscribed">{subscribed ? 'true' : 'false'}</div>
      );
    };

    render(
      <PeerProvider>
        <TestComponentWithSubscription />
      </PeerProvider>
    );

    expect(screen.getByTestId('subscribed')).toHaveTextContent('true');
  });
});