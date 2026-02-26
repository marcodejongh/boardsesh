import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import React from 'react';
import { useInfiniteScroll } from '../use-infinite-scroll';

// Capture the IntersectionObserver mock state
let observerCallback: IntersectionObserverCallback;
let observerOptions: IntersectionObserverInit | undefined;
let mockObserve: ReturnType<typeof vi.fn>;
let mockDisconnect: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockObserve = vi.fn();
  mockDisconnect = vi.fn();

  class MockIntersectionObserver {
    constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
      observerCallback = callback;
      observerOptions = options;
    }
    observe = mockObserve;
    disconnect = mockDisconnect;
    unobserve = vi.fn();
  }

  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
});

function triggerIntersection(isIntersecting: boolean) {
  act(() => {
    observerCallback(
      [{ isIntersecting } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
  });
}

// Test component that renders the sentinel div so the ref gets attached
function TestComponent(props: {
  onLoadMore: () => void;
  hasMore: boolean;
  isFetching?: boolean;
  rootMargin?: string;
}) {
  const { sentinelRef } = useInfiniteScroll(props);
  return React.createElement('div', { ref: sentinelRef, 'data-testid': 'sentinel' });
}

describe('useInfiniteScroll', () => {
  it('creates an IntersectionObserver with default rootMargin', () => {
    const onLoadMore = vi.fn();

    render(React.createElement(TestComponent, { onLoadMore, hasMore: true }));

    expect(observerOptions?.rootMargin).toBe('200px');
    expect(observerOptions?.threshold).toBe(0);
    expect(observerOptions?.root).toBeNull();
  });

  it('observes the sentinel element', () => {
    const onLoadMore = vi.fn();

    render(React.createElement(TestComponent, { onLoadMore, hasMore: true }));

    expect(mockObserve).toHaveBeenCalledTimes(1);
  });

  it('calls onLoadMore when sentinel is intersecting and hasMore is true', () => {
    const onLoadMore = vi.fn();

    render(React.createElement(TestComponent, { onLoadMore, hasMore: true }));

    triggerIntersection(true);
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('does not call onLoadMore when sentinel is not intersecting', () => {
    const onLoadMore = vi.fn();

    render(React.createElement(TestComponent, { onLoadMore, hasMore: true }));

    triggerIntersection(false);
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('does not call onLoadMore when hasMore is false', () => {
    const onLoadMore = vi.fn();

    render(React.createElement(TestComponent, { onLoadMore, hasMore: false }));

    triggerIntersection(true);
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('does not call onLoadMore when isFetching is true', () => {
    const onLoadMore = vi.fn();

    render(React.createElement(TestComponent, { onLoadMore, hasMore: true, isFetching: true }));

    triggerIntersection(true);
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('uses the latest onLoadMore callback without recreating observer', () => {
    const onLoadMore1 = vi.fn();
    const onLoadMore2 = vi.fn();

    const { rerender } = render(
      React.createElement(TestComponent, { onLoadMore: onLoadMore1, hasMore: true }),
    );

    // Update the callback
    rerender(
      React.createElement(TestComponent, { onLoadMore: onLoadMore2, hasMore: true }),
    );

    triggerIntersection(true);
    expect(onLoadMore1).not.toHaveBeenCalled();
    expect(onLoadMore2).toHaveBeenCalledTimes(1);
  });

  it('respects updated hasMore value without recreating observer', () => {
    const onLoadMore = vi.fn();

    const { rerender } = render(
      React.createElement(TestComponent, { onLoadMore, hasMore: true }),
    );

    // Disable further loading
    rerender(
      React.createElement(TestComponent, { onLoadMore, hasMore: false }),
    );

    triggerIntersection(true);
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('respects updated isFetching value without recreating observer', () => {
    const onLoadMore = vi.fn();

    const { rerender } = render(
      React.createElement(TestComponent, { onLoadMore, hasMore: true, isFetching: false }),
    );

    // Start fetching
    rerender(
      React.createElement(TestComponent, { onLoadMore, hasMore: true, isFetching: true }),
    );

    triggerIntersection(true);
    expect(onLoadMore).not.toHaveBeenCalled();

    // Stop fetching
    rerender(
      React.createElement(TestComponent, { onLoadMore, hasMore: true, isFetching: false }),
    );

    triggerIntersection(true);
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('disconnects the observer on unmount', () => {
    const onLoadMore = vi.fn();

    const { unmount } = render(
      React.createElement(TestComponent, { onLoadMore, hasMore: true }),
    );

    unmount();
    expect(mockDisconnect).toHaveBeenCalled();
  });

  it('accepts a custom rootMargin', () => {
    const onLoadMore = vi.fn();

    render(
      React.createElement(TestComponent, { onLoadMore, hasMore: true, rootMargin: '500px' }),
    );

    expect(observerOptions?.rootMargin).toBe('500px');
  });

  it('calls onLoadMore multiple times on successive intersections', () => {
    const onLoadMore = vi.fn();

    render(React.createElement(TestComponent, { onLoadMore, hasMore: true }));

    triggerIntersection(true);
    triggerIntersection(true);
    triggerIntersection(true);
    expect(onLoadMore).toHaveBeenCalledTimes(3);
  });
});
