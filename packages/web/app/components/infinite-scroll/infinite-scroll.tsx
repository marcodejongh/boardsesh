'use client';

import React, { useEffect, useRef, ReactNode } from 'react';

interface InfiniteScrollProps {
  children: ReactNode;
  loadMore: () => void;
  hasMore: boolean;
  isLoading?: boolean;
  loader?: ReactNode;
  endMessage?: ReactNode;
  scrollableTarget?: string;
  threshold?: number;
  rootMargin?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Custom InfiniteScroll component using IntersectionObserver.
 * Triggers loadMore when the sentinel element becomes visible in the viewport.
 */
const InfiniteScroll = ({
  children,
  loadMore,
  hasMore,
  isLoading = false,
  loader,
  endMessage,
  scrollableTarget,
  threshold = 0.1,
  rootMargin = '100px',
  className,
  style,
}: InfiniteScrollProps) => {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Use refs to avoid recreating the observer when these values change
  const loadMoreRef = useRef(loadMore);
  const hasMoreRef = useRef(hasMore);
  const isLoadingRef = useRef(isLoading);

  // Keep refs in sync with props
  useEffect(() => {
    loadMoreRef.current = loadMore;
  }, [loadMore]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    // Get the root element if scrollableTarget is specified
    const root = scrollableTarget ? document.getElementById(scrollableTarget) : null;

    // Disconnect previous observer if it exists
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Create new IntersectionObserver
    observerRef.current = new IntersectionObserver(
      (entries: IntersectionObserverEntry[]) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMoreRef.current && !isLoadingRef.current) {
          loadMoreRef.current();
        }
      },
      {
        root,
        rootMargin,
        threshold,
      },
    );

    observerRef.current.observe(sentinel);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [scrollableTarget, rootMargin, threshold]);

  return (
    <div className={className} style={style}>
      {children}
      {/* Sentinel element that triggers loading when visible */}
      <div ref={sentinelRef} style={{ height: '1px', width: '100%' }} />
      {isLoading && loader}
      {!hasMore && !isLoading && endMessage}
    </div>
  );
};

export default InfiniteScroll;
