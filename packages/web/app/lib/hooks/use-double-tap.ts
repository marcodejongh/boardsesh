import { useRef, useCallback, type RefCallback } from 'react';

const DOUBLE_TAP_THRESHOLD = 300;

/**
 * Hook that handles double-tap on touch devices without triggering iOS Safari's
 * double-tap-to-zoom behavior. Also supports desktop double-click.
 *
 * Returns a ref callback and an onDoubleClick handler to spread onto the element.
 */
export function useDoubleTap(callback: (() => void) | undefined) {
  const lastTapTimeRef = useRef(0);
  const elementRef = useRef<HTMLElement | null>(null);
  // Once any touch event is detected, permanently disable onDoubleClick
  // to prevent the browser's synthesized dblclick from double-firing.
  const isTouchDeviceRef = useRef(false);

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      isTouchDeviceRef.current = true;

      if (!callback) return;

      const now = Date.now();
      const timeSinceLastTap = now - lastTapTimeRef.current;

      if (timeSinceLastTap > 0 && timeSinceLastTap < DOUBLE_TAP_THRESHOLD) {
        e.preventDefault();
        lastTapTimeRef.current = 0;
        callback();
      } else {
        lastTapTimeRef.current = now;
      }
    },
    [callback],
  );

  const ref: RefCallback<HTMLElement> = useCallback(
    (node: HTMLElement | null) => {
      // Cleanup previous listener
      if (elementRef.current) {
        elementRef.current.removeEventListener('touchend', handleTouchEnd);
      }

      elementRef.current = node;

      // Attach new listener
      if (node) {
        node.addEventListener('touchend', handleTouchEnd, { passive: false });
      }
    },
    [handleTouchEnd],
  );

  const onDoubleClick = useCallback(() => {
    // On touch devices, ignore synthesized dblclick events entirely
    if (isTouchDeviceRef.current) return;
    callback?.();
  }, [callback]);

  return { ref, onDoubleClick };
}
