import { describe, it, expect, vi, beforeEach } from 'vitest';

// Capture the `on` handlers passed to createClient so we can invoke them in tests
let capturedOnHandlers: {
  connected?: () => void;
  closed?: (event: unknown) => void;
  error?: (error: unknown) => void;
} = {};

const mockDispose = vi.fn();
const mockSubscribe = vi.fn();

vi.mock('graphql-ws', () => ({
  createClient: vi.fn((options: { on?: typeof capturedOnHandlers }) => {
    capturedOnHandlers = options.on || {};
    return {
      subscribe: mockSubscribe,
      dispose: mockDispose,
    };
  }),
}));

import { createGraphQLClient } from '../graphql-client';

describe('createGraphQLClient', () => {
  beforeEach(() => {
    capturedOnHandlers = {};
    vi.clearAllMocks();
  });

  describe('onConnectionStateChange callback', () => {
    it('calls onConnectionStateChange(true, false) on first connection', () => {
      const onConnectionStateChange = vi.fn();
      createGraphQLClient({
        url: 'ws://test',
        onConnectionStateChange,
      });

      capturedOnHandlers.connected!();

      expect(onConnectionStateChange).toHaveBeenCalledTimes(1);
      expect(onConnectionStateChange).toHaveBeenCalledWith(true, false);
    });

    it('calls onConnectionStateChange(true, true) on reconnection', () => {
      const onConnectionStateChange = vi.fn();
      createGraphQLClient({
        url: 'ws://test',
        onConnectionStateChange,
      });

      // First connection
      capturedOnHandlers.connected!();
      onConnectionStateChange.mockClear();

      // Reconnection
      capturedOnHandlers.connected!();

      expect(onConnectionStateChange).toHaveBeenCalledTimes(1);
      expect(onConnectionStateChange).toHaveBeenCalledWith(true, true);
    });

    it('calls onConnectionStateChange(false, false) on close', () => {
      const onConnectionStateChange = vi.fn();
      createGraphQLClient({
        url: 'ws://test',
        onConnectionStateChange,
      });

      capturedOnHandlers.closed!({ code: 1000 });

      expect(onConnectionStateChange).toHaveBeenCalledTimes(1);
      expect(onConnectionStateChange).toHaveBeenCalledWith(false, false);
    });

    it('does not call onReconnect on first connection', () => {
      const onReconnect = vi.fn();
      createGraphQLClient({
        url: 'ws://test',
        onReconnect,
      });

      capturedOnHandlers.connected!();

      expect(onReconnect).not.toHaveBeenCalled();
    });

    it('calls onReconnect on subsequent connections', () => {
      const onReconnect = vi.fn();
      createGraphQLClient({
        url: 'ws://test',
        onReconnect,
      });

      // First connection
      capturedOnHandlers.connected!();
      expect(onReconnect).not.toHaveBeenCalled();

      // Reconnection
      capturedOnHandlers.connected!();
      expect(onReconnect).toHaveBeenCalledTimes(1);
    });

    it('fires onConnectionStateChange before onReconnect on reconnection', () => {
      const callOrder: string[] = [];
      const onConnectionStateChange = vi.fn(() => callOrder.push('stateChange'));
      const onReconnect = vi.fn(() => callOrder.push('reconnect'));

      createGraphQLClient({
        url: 'ws://test',
        onConnectionStateChange,
        onReconnect,
      });

      // First connection
      capturedOnHandlers.connected!();
      callOrder.length = 0;

      // Reconnection — stateChange should fire before reconnect
      capturedOnHandlers.connected!();

      expect(callOrder).toEqual(['stateChange', 'reconnect']);
    });

    it('reports correct sequence: connected → closed → reconnected', () => {
      const calls: Array<[boolean, boolean]> = [];
      const onConnectionStateChange = vi.fn(
        (connected: boolean, isReconnect: boolean) => calls.push([connected, isReconnect]),
      );

      createGraphQLClient({
        url: 'ws://test',
        onConnectionStateChange,
      });

      capturedOnHandlers.connected!();   // initial connect
      capturedOnHandlers.closed!({});     // socket drops
      capturedOnHandlers.connected!();   // reconnect

      expect(calls).toEqual([
        [true, false],   // initial connect
        [false, false],  // socket drops
        [true, true],    // reconnect
      ]);
    });
  });
});
