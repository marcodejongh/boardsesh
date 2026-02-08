'use client';

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useSwipeable } from 'react-swipeable';
type Placement = 'left' | 'right' | 'top' | 'bottom';

type DrawerStylesObject = Partial<Record<string, React.CSSProperties>>;

interface UseSwipeToDismissOptions {
  placement: Placement;
  onClose?: () => void;
  dismissThreshold?: number;
  dismissAnimationMs?: number;
  enabled?: boolean;
  swipeRegion?: 'handle' | 'body' | 'scrollBody';
  scrollBodyRef?: React.RefObject<HTMLElement | null>;
}

interface UseSwipeToDismissReturn {
  dragOffset: number;
  isDragging: boolean;
  handleRegionProps: ReturnType<typeof useSwipeable>;
  bodyRegionProps: ReturnType<typeof useSwipeable> | null;
  getDrawerStyle: () => React.CSSProperties;
  getDrawerStyles: () => DrawerStylesObject;
  afterOpenChange: (open: boolean) => void;
}

export const DIRECTION_MAP: Record<Placement, 'Down' | 'Up' | 'Right' | 'Left'> = {
  bottom: 'Down',
  top: 'Up',
  right: 'Right',
  left: 'Left',
};

export function getDelta(placement: Placement, deltaX: number, deltaY: number): number {
  switch (placement) {
    case 'bottom':
      return deltaY;
    case 'top':
      return -deltaY;
    case 'right':
      return deltaX;
    case 'left':
      return -deltaX;
  }
}

export function getTransform(placement: Placement, offset: number): string | undefined {
  if (offset <= 0) return undefined;
  switch (placement) {
    case 'bottom':
      return `translateY(${offset}px)`;
    case 'top':
      return `translateY(-${offset}px)`;
    case 'right':
      return `translateX(${offset}px)`;
    case 'left':
      return `translateX(-${offset}px)`;
  }
}

export function getFullDismissOffset(placement: Placement): number {
  if (typeof window === 'undefined') return 1000;
  return placement === 'top' || placement === 'bottom' ? window.innerHeight : window.innerWidth;
}

export function useSwipeToDismiss({
  placement,
  onClose,
  dismissThreshold = 120,
  dismissAnimationMs = 300,
  enabled = true,
  swipeRegion = 'handle',
  scrollBodyRef,
}: UseSwipeToDismissOptions): UseSwipeToDismissReturn {
  const [dragOffset, setDragOffset] = useState(0);
  const isDraggingRef = useRef(false);
  const isDismissingRef = useRef(false);
  const dragOffsetRef = useRef(0);

  const dismissDirection = DIRECTION_MAP[placement];

  const handleSwiping = useCallback(
    (deltaX: number, deltaY: number, dir: string) => {
      if (!enabled || isDismissingRef.current) return;
      if (dir === dismissDirection) {
        const delta = getDelta(placement, deltaX, deltaY);
        if (delta > 0) {
          isDraggingRef.current = true;
          setDragOffset(delta);
        }
      }
    },
    [enabled, placement, dismissDirection],
  );

  const handleSwiped = useCallback(
    (deltaX: number, deltaY: number, dir: string) => {
      if (!enabled || isDismissingRef.current) return;
      isDraggingRef.current = false;

      if (dir === dismissDirection) {
        const delta = getDelta(placement, deltaX, deltaY);
        if (delta >= dismissThreshold) {
          isDismissingRef.current = true;
          setDragOffset(getFullDismissOffset(placement));
          setTimeout(() => {
            onClose?.();
          }, dismissAnimationMs);
          return;
        }
      }
      setDragOffset(0);
    },
    [enabled, placement, dismissDirection, dismissThreshold, dismissAnimationMs, onClose],
  );

  const handleTouchEnd = useCallback(() => {
    if (!isDismissingRef.current) {
      setDragOffset(0);
    }
    isDraggingRef.current = false;
  }, []);

  // Keep dragOffsetRef in sync with state for use in native event listeners
  useEffect(() => {
    dragOffsetRef.current = dragOffset;
  }, [dragOffset]);

  // Native touch event listeners for scrollBody mode
  useEffect(() => {
    if (swipeRegion !== 'scrollBody' || !enabled || !scrollBodyRef?.current) return;

    const el = scrollBodyRef.current;
    let startY = 0;
    let startX = 0;
    let isDismissMode = false;

    const onTouchStart = (e: TouchEvent) => {
      if (isDismissingRef.current) return;
      startY = e.touches[0].clientY;
      startX = e.touches[0].clientX;
      isDismissMode = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (isDismissingRef.current) return;

      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const deltaY = currentY - startY;
      const deltaX = currentX - startX;

      // Only engage dismiss when at scroll top, pulling down, and vertical > horizontal
      if (el.scrollTop <= 0 && deltaY > 0 && Math.abs(deltaY) > Math.abs(deltaX)) {
        e.preventDefault();
        isDismissMode = true;
        isDraggingRef.current = true;
        setDragOffset(deltaY);
      } else if (isDismissMode) {
        // Was in dismiss mode but user changed direction, snap back
        isDismissMode = false;
        isDraggingRef.current = false;
        setDragOffset(0);
      }
    };

    const onTouchEnd = () => {
      if (isDismissingRef.current) return;

      if (isDismissMode && dragOffsetRef.current >= dismissThreshold) {
        isDismissingRef.current = true;
        setDragOffset(getFullDismissOffset(placement));
        setTimeout(() => {
          onClose?.();
        }, dismissAnimationMs);
      } else {
        setDragOffset(0);
      }
      isDraggingRef.current = false;
      isDismissMode = false;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [swipeRegion, enabled, scrollBodyRef, placement, dismissThreshold, dismissAnimationMs, onClose]);

  const handleRegionProps = useSwipeable({
    onSwiping: (eventData) => handleSwiping(eventData.deltaX, eventData.deltaY, eventData.dir),
    onSwiped: (eventData) => handleSwiped(eventData.deltaX, eventData.deltaY, eventData.dir),
    onTouchEndOrOnMouseUp: handleTouchEnd,
    trackMouse: false,
    trackTouch: true,
    preventScrollOnSwipe: true,
  });

  const bodyRegionProps = useSwipeable({
    onSwiping: (eventData) => handleSwiping(eventData.deltaX, eventData.deltaY, eventData.dir),
    onSwiped: (eventData) => handleSwiped(eventData.deltaX, eventData.deltaY, eventData.dir),
    onTouchEndOrOnMouseUp: handleTouchEnd,
    trackMouse: false,
    trackTouch: true,
    preventScrollOnSwipe: true,
  });

  const afterOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setDragOffset(0);
      isDismissingRef.current = false;
    }
  }, []);

  const getDrawerStyle = useCallback((): React.CSSProperties => {
    return {
      transform: getTransform(placement, dragOffset),
      transition: isDraggingRef.current ? 'none' : `transform ${dismissAnimationMs}ms ease-out`,
    };
  }, [placement, dragOffset, dismissAnimationMs]);

  const getDrawerStyles = useCallback((): DrawerStylesObject => {
    const fullOffset = getFullDismissOffset(placement);
    const maskStyle =
      dragOffset > 0
        ? {
            opacity: Math.max(0, 1 - dragOffset / fullOffset),
            transition: isDraggingRef.current ? 'none' : `opacity ${dismissAnimationMs}ms ease-out`,
          }
        : {};

    const wrapperStyle = dragOffset > 0 ? { boxShadow: 'none' as const } : {};

    const bodyStyle: React.CSSProperties =
      swipeRegion === 'body'
        ? { touchAction: 'none' as const, overscrollBehaviorY: 'contain' as const }
        : swipeRegion === 'scrollBody'
          ? { overscrollBehaviorY: 'contain' as const }
          : {};

    return {
      mask: maskStyle,
      wrapper: wrapperStyle,
      body: bodyStyle,
    };
  }, [placement, dragOffset, dismissAnimationMs, swipeRegion]);

  return useMemo(
    () => ({
      dragOffset,
      isDragging: isDraggingRef.current,
      handleRegionProps,
      bodyRegionProps: swipeRegion === 'body' ? bodyRegionProps : null,  // null for 'handle' and 'scrollBody'
      getDrawerStyle,
      getDrawerStyles,
      afterOpenChange,
    }),
    [dragOffset, handleRegionProps, bodyRegionProps, swipeRegion, getDrawerStyle, getDrawerStyles, afterOpenChange],
  );
}
