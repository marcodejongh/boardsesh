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
  // Tracks whether the touch handler already fired the callback,
  // so the synthesized dblclick event doesn't fire it a second time.
  const handledByTouchRef = useRef(false);

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!callback) return;

      const now = Date.now();
      const timeSinceLastTap = now - lastTapTimeRef.current;

      if (timeSinceLastTap > 0 && timeSinceLastTap < DOUBLE_TAP_THRESHOLD) {
        e.preventDefault();
        lastTapTimeRef.current = 0;
        handledByTouchRef.current = true;
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
    // Skip if the touch handler already fired the callback for this interaction
    if (handledByTouchRef.current) {
      handledByTouchRef.current = false;
      return;
    }
    callback?.();
  }, [callback]);

  return { ref, onDoubleClick };
}
