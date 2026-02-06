'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import { useSwipeable } from 'react-swipeable';
import type { DrawerProps } from 'antd';

type Placement = NonNullable<DrawerProps['placement']>;

type DrawerStylesObject = Partial<Record<string, React.CSSProperties>>;

interface UseSwipeToDismissOptions {
  placement: Placement;
  onClose?: () => void;
  dismissThreshold?: number;
  dismissAnimationMs?: number;
  enabled?: boolean;
  swipeRegion?: 'handle' | 'body';
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

const DIRECTION_MAP: Record<Placement, 'Down' | 'Up' | 'Right' | 'Left'> = {
  bottom: 'Down',
  top: 'Up',
  right: 'Right',
  left: 'Left',
};

function getDelta(placement: Placement, deltaX: number, deltaY: number): number {
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

function getTransform(placement: Placement, offset: number): string | undefined {
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

function getFullDismissOffset(placement: Placement): number {
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
}: UseSwipeToDismissOptions): UseSwipeToDismissReturn {
  const [dragOffset, setDragOffset] = useState(0);
  const isDraggingRef = useRef(false);
  const isDismissingRef = useRef(false);

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
    if (!enabled) return {};
    return {
      transform: getTransform(placement, dragOffset),
      transition: isDraggingRef.current ? 'none' : `transform ${dismissAnimationMs}ms ease-out`,
    };
  }, [enabled, placement, dragOffset, dismissAnimationMs]);

  const getDrawerStyles = useCallback((): DrawerStylesObject => {
    if (!enabled) return {};

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
        : {};

    return {
      mask: maskStyle,
      wrapper: wrapperStyle,
      body: bodyStyle,
    };
  }, [enabled, placement, dragOffset, dismissAnimationMs, swipeRegion]);

  return useMemo(
    () => ({
      dragOffset,
      isDragging: isDraggingRef.current,
      handleRegionProps,
      bodyRegionProps: swipeRegion === 'body' ? bodyRegionProps : null,
      getDrawerStyle,
      getDrawerStyles,
      afterOpenChange,
    }),
    [dragOffset, handleRegionProps, bodyRegionProps, swipeRegion, getDrawerStyle, getDrawerStyles, afterOpenChange],
  );
}
