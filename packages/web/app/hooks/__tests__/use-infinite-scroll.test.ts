import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { useInfiniteScroll } from '../use-infinite-scroll';

// Track all IntersectionObserver instances and their callbacks
let observerInstances: Array<{
  callback: IntersectionObserverCallback;
  options?: IntersectionObserverInit;
  observe: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}> = [];

function latestObserver() {
  return observerInstances[observerInstances.length - 1];
}

function triggerIntersection(isIntersecting: boolean) {
  const instance = latestObserver();
  if (!instance) throw new Error('No IntersectionObserver instance found');
  instance.callback(
    [{ isIntersecting } as IntersectionObserverEntry],
    {} as IntersectionObserver,
  );
}

// Test component that renders the sentinel div with the ref
function TestComponent(props: {
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  rootMargin?: string;
}) {
  const sentinelRef = useInfiniteScroll(props);
  return React.createElement('div', { 'data-testid': 'sentinel', ref: sentinelRef });
}

describe('useInfiniteScroll', () => {
  beforeEach(() => {
    observerInstances = [];

    vi.stubGlobal(
      'IntersectionObserver',
      class MockIntersectionObserver {
        constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
          const instance = {
            callback,
            options,
            observe: vi.fn(),
            disconnect: vi.fn(),
          };
          observerInstances.push(instance);
          this.observe = instance.observe;
          this.disconnect = instance.disconnect;
          this.unobserve = vi.fn();
        }
        observe: ReturnType<typeof vi.fn>;
        disconnect: ReturnType<typeof vi.fn>;
        unobserve: ReturnType<typeof vi.fn>;
      },
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('creates an IntersectionObserver and observes the sentinel element', () => {
    render(
      React.createElement(TestComponent, {
        onLoadMore: vi.fn(),
        hasMore: true,
        isLoading: false,
      }),
    );

    expect(observerInstances).toHaveLength(1);
    expect(latestObserver().observe).toHaveBeenCalledOnce();
  });

  it('uses default rootMargin of 200px', () => {
    render(
      React.createElement(TestComponent, {
        onLoadMore: vi.fn(),
        hasMore: true,
        isLoading: false,
      }),
    );

    expect(latestObserver().options?.rootMargin).toBe('200px');
  });

  it('uses custom rootMargin when provided', () => {
    render(
      React.createElement(TestComponent, {
        onLoadMore: vi.fn(),
        hasMore: true,
        isLoading: false,
        rootMargin: '500px',
      }),
    );

    expect(latestObserver().options?.rootMargin).toBe('500px');
  });

  it('calls onLoadMore when sentinel intersects and hasMore is true', () => {
    const onLoadMore = vi.fn();
    render(
      React.createElement(TestComponent, {
        onLoadMore,
        hasMore: true,
        isLoading: false,
      }),
    );

    triggerIntersection(true);
    expect(onLoadMore).toHaveBeenCalledOnce();
  });

  it('does not call onLoadMore when sentinel is not intersecting', () => {
    const onLoadMore = vi.fn();
    render(
      React.createElement(TestComponent, {
        onLoadMore,
        hasMore: true,
        isLoading: false,
      }),
    );

    triggerIntersection(false);
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('does not call onLoadMore when hasMore is false', () => {
    const onLoadMore = vi.fn();
    render(
      React.createElement(TestComponent, {
        onLoadMore,
        hasMore: false,
        isLoading: false,
      }),
    );

    triggerIntersection(true);
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('does not call onLoadMore when isLoading is true', () => {
    const onLoadMore = vi.fn();
    render(
      React.createElement(TestComponent, {
        onLoadMore,
        hasMore: true,
        isLoading: true,
      }),
    );

    triggerIntersection(true);
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('uses latest onLoadMore callback via ref (no observer recreation)', () => {
    const onLoadMore1 = vi.fn();
    const onLoadMore2 = vi.fn();

    const { rerender } = render(
      React.createElement(TestComponent, {
        onLoadMore: onLoadMore1,
        hasMore: true,
        isLoading: false,
      }),
    );

    // Update the callback — should NOT create a new observer
    rerender(
      React.createElement(TestComponent, {
        onLoadMore: onLoadMore2,
        hasMore: true,
        isLoading: false,
      }),
    );

    // Only one observer should have been created
    expect(observerInstances).toHaveLength(1);

    // Trigger intersection — should use the latest callback
    triggerIntersection(true);
    expect(onLoadMore1).not.toHaveBeenCalled();
    expect(onLoadMore2).toHaveBeenCalledOnce();
  });

  it('respects updated hasMore=false via ref', () => {
    const onLoadMore = vi.fn();

    const { rerender } = render(
      React.createElement(TestComponent, {
        onLoadMore,
        hasMore: true,
        isLoading: false,
      }),
    );

    rerender(
      React.createElement(TestComponent, {
        onLoadMore,
        hasMore: false,
        isLoading: false,
      }),
    );

    triggerIntersection(true);
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('respects updated isLoading=true via ref', () => {
    const onLoadMore = vi.fn();

    const { rerender } = render(
      React.createElement(TestComponent, {
        onLoadMore,
        hasMore: true,
        isLoading: false,
      }),
    );

    rerender(
      React.createElement(TestComponent, {
        onLoadMore,
        hasMore: true,
        isLoading: true,
      }),
    );

    triggerIntersection(true);
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('disconnects observer on unmount', () => {
    const { unmount } = render(
      React.createElement(TestComponent, {
        onLoadMore: vi.fn(),
        hasMore: true,
        isLoading: false,
      }),
    );

    const observer = latestObserver();
    unmount();
    expect(observer.disconnect).toHaveBeenCalled();
  });
});
