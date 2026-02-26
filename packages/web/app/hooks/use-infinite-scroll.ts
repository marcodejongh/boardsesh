'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

interface UseInfiniteScrollOptions {
  /** Called when sentinel becomes visible and hasMore is true */
  onLoadMore: () => void;
  /** Whether there are more items to load */
  hasMore: boolean;
  /** Whether a fetch is currently in progress (prevents duplicate fetches) */
  isFetching?: boolean;
  /** Root margin for the IntersectionObserver. Defaults to '200px'. */
  rootMargin?: string;
}

/**
 * Reusable IntersectionObserver hook for infinite scroll.
 * Returns a sentinelRef callback to attach to a div at the bottom of the list.
 * When the sentinel enters the viewport, onLoadMore is called.
 *
 * Uses a callback ref + useState so the observer is created when the
 * sentinel mounts into the DOM, even if it appears after the initial render.
 */
export function useInfiniteScroll({
  onLoadMore,
  hasMore,
  isFetching = false,
  rootMargin = '200px',
}: UseInfiniteScrollOptions) {
  const [sentinelElement, setSentinelElement] = useState<HTMLDivElement | null>(null);

  // Callback ref — works identically with JSX ref props
  const sentinelRef = useCallback((node: HTMLDivElement | null) => {
    setSentinelElement(node);
  }, []);

  // Store callback values in refs to prevent observer recreation
  const onLoadMoreRef = useRef(onLoadMore);
  const hasMoreRef = useRef(hasMore);
  const isFetchingRef = useRef(isFetching);
  onLoadMoreRef.current = onLoadMore;
  hasMoreRef.current = hasMore;
  isFetchingRef.current = isFetching;

  // Stable observer callback — never recreated
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && hasMoreRef.current && !isFetchingRef.current) {
        onLoadMoreRef.current();
      }
    },
    [],
  );

  useEffect(() => {
    if (!sentinelElement) return;

    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin,
      threshold: 0,
    });

    observer.observe(sentinelElement);

    return () => {
      observer.disconnect();
    };
  }, [sentinelElement, handleObserver, rootMargin]);

  return { sentinelRef };
}
