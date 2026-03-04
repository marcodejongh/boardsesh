import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import { connectionManager } from '../websocket-connection-manager';
import { WebSocketConnectionProvider, useWebSocketConnection } from '../websocket-connection-provider';

class FakeClient {
  listeners = new Map<string, (...args: any[]) => void>();
  terminate = vi.fn();
  dispose = vi.fn();

  on(event: string, listener: (...args: any[]) => void) {
    this.listeners.set(event, listener);
    return () => this.listeners.delete(event);
  }

  emit(event: string, ...args: any[]) {
    const handler = this.listeners.get(event);
    if (handler) handler(...args);
  }
}

function TestConsumer() {
  const { state, name } = useWebSocketConnection();
  return <div data-testid="state">{state}:{name ?? 'none'}</div>;
}

describe('WebSocketConnectionProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    connectionManager.__resetForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('delivers idle state when no clients are registered', () => {
    render(
      <WebSocketConnectionProvider>
        <TestConsumer />
      </WebSocketConnectionProvider>,
    );

    expect(screen.getByTestId('state').textContent).toBe('idle:none');
  });

  it('updates state when a client connects', () => {
    const client = new FakeClient();

    render(
      <WebSocketConnectionProvider>
        <TestConsumer />
      </WebSocketConnectionProvider>,
    );

    act(() => {
      connectionManager.registerClient(client as any, 'session');
    });

    expect(screen.getByTestId('state').textContent).toBe('connecting:session');

    act(() => {
      client.emit('connected');
    });

    expect(screen.getByTestId('state').textContent).toBe('connected:session');
  });

  it('updates state through reconnection cycle', () => {
    const client = new FakeClient();

    render(
      <WebSocketConnectionProvider>
        <TestConsumer />
      </WebSocketConnectionProvider>,
    );

    act(() => {
      connectionManager.registerClient(client as any, 'session');
      client.emit('connected');
    });

    expect(screen.getByTestId('state').textContent).toBe('connected:session');

    act(() => {
      client.emit('closed');
    });

    expect(screen.getByTestId('state').textContent).toBe('reconnecting:session');

    act(() => {
      client.emit('connecting');
    });

    expect(screen.getByTestId('state').textContent).toBe('connecting:session');

    act(() => {
      client.emit('connected');
    });

    expect(screen.getByTestId('state').textContent).toBe('connected:session');
  });

  it('returns idle when unregistered', () => {
    const client = new FakeClient();
    let unregister: () => void;

    render(
      <WebSocketConnectionProvider>
        <TestConsumer />
      </WebSocketConnectionProvider>,
    );

    act(() => {
      unregister = connectionManager.registerClient(client as any, 'session');
      client.emit('connected');
    });

    expect(screen.getByTestId('state').textContent).toBe('connected:session');

    act(() => {
      unregister();
    });

    expect(screen.getByTestId('state').textContent).toBe('idle:none');
  });
});

describe('useWebSocketConnection fallback (no provider)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    connectionManager.__resetForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns idle snapshot without a provider', () => {
    render(<TestConsumer />);

    expect(screen.getByTestId('state').textContent).toBe('idle:none');
  });

  it('returns a stable reference across renders without a provider', () => {
    const refs: any[] = [];

    function RefTracker() {
      const value = useWebSocketConnection();
      refs.push(value);
      return <div />;
    }

    const { rerender } = render(<RefTracker />);
    rerender(<RefTracker />);

    // Both renders should return the same object reference (stable fallback)
    expect(refs[0]).toBe(refs[1]);
  });
});
