import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { connectionManager, STALE_GRACE_MS } from '../websocket-connection-manager';

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

describe('WebSocketConnectionManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    connectionManager.__resetForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('terminates a stale connection and marks reconnecting', () => {
    const client = new FakeClient();
    const unregister = connectionManager.registerClient(client as any, 'session');
    client.emit('connected');

    // Advance past stale threshold and health check interval
    vi.advanceTimersByTime(STALE_GRACE_MS + 1500);

    expect(client.terminate).toHaveBeenCalled();
    expect(connectionManager.getSnapshot().state).toBe('reconnecting');

    unregister();
  });

  it('forces reconnect on visibilitychange to visible', () => {
    const client = new FakeClient();
    const unregister = connectionManager.registerClient(client as any, 'session');
    client.emit('connected');

    // Ensure document reports visible
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    vi.setSystemTime(Date.now() + STALE_GRACE_MS + 500);
    document.dispatchEvent(new Event('visibilitychange'));

    expect(client.terminate).toHaveBeenCalled();
    expect(connectionManager.getSnapshot().state).toBe('reconnecting');

    unregister();
  });

  it('exposes error state when client errors', () => {
    const client = new FakeClient();
    const unregister = connectionManager.registerClient(client as any, 'session');

    client.emit('error', new Error('boom'));

    expect(connectionManager.getSnapshot().state).toBe('error');

    unregister();
  });
});
