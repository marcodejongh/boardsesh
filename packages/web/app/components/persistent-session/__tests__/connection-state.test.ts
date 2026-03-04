import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Tests for the isReconnecting derivation logic and visibilitychange handler.
 *
 * The actual derivation lives in PersistentSessionProvider as:
 *   const isReconnecting = hasConnected && !isWebSocketConnected;
 *
 * These tests verify the derivation truth table and the visibilitychange
 * debounce behavior as isolated logic (no full provider rendering needed).
 */

describe('isReconnecting derivation', () => {
  // Pure logic extracted from the provider — tests the truth table
  function deriveIsReconnecting(hasConnected: boolean, isWebSocketConnected: boolean): boolean {
    return hasConnected && !isWebSocketConnected;
  }

  it('is false during initial connection (hasConnected=false)', () => {
    // Before joinSession succeeds, hasConnected is false
    expect(deriveIsReconnecting(false, false)).toBe(false);
  });

  it('is false when first connected (hasConnected=true, ws=true)', () => {
    // After successful initial connection
    expect(deriveIsReconnecting(true, true)).toBe(false);
  });

  it('is true when socket drops after established connection', () => {
    // hasConnected=true (we were connected), isWebSocketConnected=false (socket dropped)
    expect(deriveIsReconnecting(true, false)).toBe(true);
  });

  it('is false when socket reconnects and resync completes', () => {
    // Both true — connection is healthy again
    expect(deriveIsReconnecting(true, true)).toBe(false);
  });

  it('is false during initial auth loading (neither connected)', () => {
    expect(deriveIsReconnecting(false, true)).toBe(false);
  });
});

describe('reconnect lock timing', () => {
  /**
   * Simulates the state transitions during reconnection to verify
   * that isReconnecting stays true until handleReconnect completes.
   *
   * The key invariant: on.connected fires onConnectionStateChange(true, isReconnect=true)
   * but the persistent session SKIPS setting isWebSocketConnected=true. Only
   * handleReconnect's finally block sets it after resync.
   */

  it('keeps isReconnecting=true during reconnection resync', () => {
    let isWebSocketConnected = true;
    let hasConnected = true;
    const derive = () => hasConnected && !isWebSocketConnected;

    // Initial state: connected
    expect(derive()).toBe(false);

    // Socket drops: on.closed fires
    isWebSocketConnected = false;
    expect(derive()).toBe(true);

    // Socket reconnects: on.connected fires with isReconnect=true
    // The callback SKIPS setting isWebSocketConnected=true (deferred)
    // isWebSocketConnected stays false during resync
    expect(derive()).toBe(true);

    // handleReconnect completes resync: finally block sets isWebSocketConnected=true
    isWebSocketConnected = true;
    expect(derive()).toBe(false);
  });

  it('sets isWebSocketConnected=true on initial connect (not deferred)', () => {
    let isWebSocketConnected = false;
    let hasConnected = false;
    const derive = () => hasConnected && !isWebSocketConnected;

    // on.connected fires with isReconnect=false — sets immediately
    isWebSocketConnected = true;
    expect(derive()).toBe(false);

    // joinSession succeeds
    hasConnected = true;
    expect(derive()).toBe(false);
  });
});

describe('visibilitychange handler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces resync trigger with 300ms delay', () => {
    const triggerResync = vi.fn();
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    // Simulate the handler logic from persistent-session-context.tsx
    const handleVisibilityChange = (visibilityState: string) => {
      if (visibilityState === 'visible') {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          triggerResync();
        }, 300);
      }
    };

    handleVisibilityChange('visible');

    // Before debounce expires
    expect(triggerResync).not.toHaveBeenCalled();

    // After 300ms
    vi.advanceTimersByTime(300);
    expect(triggerResync).toHaveBeenCalledTimes(1);
  });

  it('cancels previous debounce on rapid visibility changes', () => {
    const triggerResync = vi.fn();
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const handleVisibilityChange = (visibilityState: string) => {
      if (visibilityState === 'visible') {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          triggerResync();
        }, 300);
      }
    };

    // Rapid background/foreground cycling
    handleVisibilityChange('visible');
    vi.advanceTimersByTime(100);
    handleVisibilityChange('visible');
    vi.advanceTimersByTime(100);
    handleVisibilityChange('visible');

    // Only 200ms since last call — no trigger yet
    vi.advanceTimersByTime(200);
    expect(triggerResync).not.toHaveBeenCalled();

    // 300ms since last call — triggers once
    vi.advanceTimersByTime(100);
    expect(triggerResync).toHaveBeenCalledTimes(1);
  });

  it('does not trigger on hidden visibility state', () => {
    const triggerResync = vi.fn();
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const handleVisibilityChange = (visibilityState: string) => {
      if (visibilityState === 'visible') {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          triggerResync();
        }, 300);
      }
    };

    handleVisibilityChange('hidden');
    vi.advanceTimersByTime(500);

    expect(triggerResync).not.toHaveBeenCalled();
  });
});
