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
  let originalVisibilityState: PropertyDescriptor | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    connectionManager.__resetForTests();
    originalVisibilityState = Object.getOwnPropertyDescriptor(document, 'visibilityState');
  });

  afterEach(() => {
    vi.useRealTimers();
    // Restore original visibilityState property to avoid leaking between tests
    if (originalVisibilityState) {
      Object.defineProperty(document, 'visibilityState', originalVisibilityState);
    } else {
      delete (document as any).visibilityState;
    }
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

  it('sets state to reconnecting on closed event', () => {
    const client = new FakeClient();
    const unregister = connectionManager.registerClient(client as any, 'session');
    client.emit('connected');

    expect(connectionManager.getSnapshot().state).toBe('connected');

    client.emit('closed');

    expect(connectionManager.getSnapshot().state).toBe('reconnecting');

    unregister();
  });

  it('ping with received=true marks activity, received=false does not', () => {
    const client = new FakeClient();
    const unregister = connectionManager.registerClient(client as any, 'session');
    client.emit('connected');

    const activityAfterConnect = connectionManager.getSnapshot().lastActivity!;

    // Advance time and send ping with received=false — should NOT update activity
    vi.advanceTimersByTime(100);
    client.emit('ping', false);
    expect(connectionManager.getSnapshot().lastActivity).toBe(activityAfterConnect);

    // Send ping with received=true — should update activity
    vi.advanceTimersByTime(100);
    client.emit('ping', true);
    expect(connectionManager.getSnapshot().lastActivity).toBeGreaterThan(activityAfterConnect);

    unregister();
  });

  it('pong with received=true resets state to connected', () => {
    const client = new FakeClient();
    const unregister = connectionManager.registerClient(client as any, 'session');

    // Start in connecting state
    expect(connectionManager.getSnapshot().state).toBe('connecting');

    // Pong with received=true should set state to connected
    client.emit('pong', true);
    expect(connectionManager.getSnapshot().state).toBe('connected');

    unregister();
  });

  it('switches primary with setPrimaryName()', () => {
    const clientA = new FakeClient();
    const clientB = new FakeClient();
    const unregA = connectionManager.registerClient(clientA as any, 'queue');
    const unregB = connectionManager.registerClient(clientB as any, 'session');

    clientA.emit('connected');
    clientB.emit('connecting');

    // session is primary by default (auto-promoted because name === 'session')
    expect(connectionManager.getSnapshot().name).toBe('session');
    expect(connectionManager.getSnapshot().state).toBe('connecting');

    // Switch primary to queue
    connectionManager.setPrimaryName('queue');
    expect(connectionManager.getSnapshot().name).toBe('queue');
    expect(connectionManager.getSnapshot().state).toBe('connected');

    unregA();
    unregB();
  });

  it('unregister cleans up listeners and resets state to idle when last client removed', () => {
    const client = new FakeClient();
    const unregister = connectionManager.registerClient(client as any, 'session');
    client.emit('connected');

    expect(connectionManager.getSnapshot().state).toBe('connected');

    unregister();

    expect(connectionManager.getSnapshot().state).toBe('idle');
    expect(connectionManager.getSnapshot().name).toBeNull();

    // Emitting after unregister should not throw or change state
    client.emit('connected');
    expect(connectionManager.getSnapshot().state).toBe('idle');
  });

  it('full reconnection cycle', () => {
    const client = new FakeClient();
    const states: string[] = [];
    connectionManager.subscribe((snapshot) => states.push(snapshot.state));

    const unregister = connectionManager.registerClient(client as any, 'session');

    // connecting → connected
    client.emit('connected');
    expect(connectionManager.getSnapshot().state).toBe('connected');

    // connected → reconnecting (via closed)
    client.emit('closed');
    expect(connectionManager.getSnapshot().state).toBe('reconnecting');

    // reconnecting → connecting
    client.emit('connecting');
    expect(connectionManager.getSnapshot().state).toBe('connecting');

    // connecting → connected
    client.emit('connected');
    expect(connectionManager.getSnapshot().state).toBe('connected');

    expect(states).toEqual([
      'idle',       // initial snapshot from subscribe
      'connecting', // registerClient
      'connected',  // connected event
      'reconnecting', // closed event
      'connecting', // connecting event
      'connected',  // connected event again
    ]);

    unregister();
  });

  it('subscribe delivers initial snapshot immediately', () => {
    const client = new FakeClient();
    const unregister = connectionManager.registerClient(client as any, 'session');
    client.emit('connected');

    const snapshots: any[] = [];
    const unsub = connectionManager.subscribe((snapshot) => snapshots.push(snapshot));

    // Should have received exactly one snapshot immediately
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].state).toBe('connected');
    expect(snapshots[0].name).toBe('session');

    unsub();
    unregister();
  });
});
