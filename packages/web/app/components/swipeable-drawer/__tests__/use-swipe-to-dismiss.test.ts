import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Capture the config passed to useSwipeable so we can invoke callbacks in tests
let capturedSwipeableConfig: Record<string, any> = {};
vi.mock('react-swipeable', () => ({
  useSwipeable: (config: Record<string, any>) => {
    capturedSwipeableConfig = config;
    return { ref: vi.fn() };
  },
}));

import {
  getDelta,
  getTransform,
  getFullDismissOffset,
  DIRECTION_MAP,
  useSwipeToDismiss,
} from '../use-swipe-to-dismiss';

describe('use-swipe-to-dismiss', () => {
  describe('DIRECTION_MAP', () => {
    it('maps bottom to Down', () => {
      expect(DIRECTION_MAP.bottom).toBe('Down');
    });

    it('maps top to Up', () => {
      expect(DIRECTION_MAP.top).toBe('Up');
    });

    it('maps right to Right', () => {
      expect(DIRECTION_MAP.right).toBe('Right');
    });

    it('maps left to Left', () => {
      expect(DIRECTION_MAP.left).toBe('Left');
    });
  });

  describe('getDelta', () => {
    it('returns deltaY for bottom placement', () => {
      expect(getDelta('bottom', 10, 50)).toBe(50);
    });

    it('returns -deltaY for top placement', () => {
      expect(getDelta('top', 10, 50)).toBe(-50);
    });

    it('returns deltaX for right placement', () => {
      expect(getDelta('right', 30, 10)).toBe(30);
    });

    it('returns -deltaX for left placement', () => {
      expect(getDelta('left', 30, 10)).toBe(-30);
    });
  });

  describe('getTransform', () => {
    it('returns translateY(px) for bottom placement', () => {
      expect(getTransform('bottom', 100)).toBe('translateY(100px)');
    });

    it('returns translateY(-px) for top placement', () => {
      expect(getTransform('top', 100)).toBe('translateY(-100px)');
    });

    it('returns translateX(px) for right placement', () => {
      expect(getTransform('right', 50)).toBe('translateX(50px)');
    });

    it('returns translateX(-px) for left placement', () => {
      expect(getTransform('left', 50)).toBe('translateX(-50px)');
    });

    it('returns undefined when offset is 0', () => {
      expect(getTransform('bottom', 0)).toBeUndefined();
    });

    it('returns undefined when offset is negative', () => {
      expect(getTransform('bottom', -10)).toBeUndefined();
    });
  });

  describe('getFullDismissOffset', () => {
    it('returns window.innerHeight for bottom placement', () => {
      expect(getFullDismissOffset('bottom')).toBe(window.innerHeight);
    });

    it('returns window.innerHeight for top placement', () => {
      expect(getFullDismissOffset('top')).toBe(window.innerHeight);
    });

    it('returns window.innerWidth for right placement', () => {
      expect(getFullDismissOffset('right')).toBe(window.innerWidth);
    });

    it('returns window.innerWidth for left placement', () => {
      expect(getFullDismissOffset('left')).toBe(window.innerWidth);
    });
  });

  describe('useSwipeToDismiss hook', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      capturedSwipeableConfig = {};
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('calls onClose after dismissAnimationMs when swiped past threshold', () => {
      const onClose = vi.fn();
      renderHook(() =>
        useSwipeToDismiss({ placement: 'bottom', onClose, dismissThreshold: 120 }),
      );

      // Simulate swiping in the dismiss direction past threshold
      act(() => {
        capturedSwipeableConfig.onSwiping({ deltaX: 0, deltaY: 130, dir: 'Down' });
      });
      act(() => {
        capturedSwipeableConfig.onSwiped({ deltaX: 0, deltaY: 130, dir: 'Down' });
      });

      expect(onClose).not.toHaveBeenCalled();
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('snaps back when swiped below threshold', () => {
      const onClose = vi.fn();
      const { result } = renderHook(() =>
        useSwipeToDismiss({ placement: 'bottom', onClose, dismissThreshold: 120 }),
      );

      // Swipe below threshold
      act(() => {
        capturedSwipeableConfig.onSwiping({ deltaX: 0, deltaY: 50, dir: 'Down' });
      });
      expect(result.current.dragOffset).toBe(50);

      act(() => {
        capturedSwipeableConfig.onSwiped({ deltaX: 0, deltaY: 50, dir: 'Down' });
      });
      expect(result.current.dragOffset).toBe(0);
      expect(onClose).not.toHaveBeenCalled();
    });

    it('does not respond to swipes when enabled=false', () => {
      const onClose = vi.fn();
      const { result } = renderHook(() =>
        useSwipeToDismiss({ placement: 'bottom', onClose, enabled: false }),
      );

      act(() => {
        capturedSwipeableConfig.onSwiping({ deltaX: 0, deltaY: 200, dir: 'Down' });
      });
      expect(result.current.dragOffset).toBe(0);
    });

    it('mask opacity decreases with drag distance', () => {
      const { result } = renderHook(() =>
        useSwipeToDismiss({ placement: 'bottom', onClose: vi.fn() }),
      );

      act(() => {
        capturedSwipeableConfig.onSwiping({ deltaX: 0, deltaY: 100, dir: 'Down' });
      });

      const styles = result.current.getDrawerStyles();
      const maskOpacity = (styles.mask as React.CSSProperties)?.opacity;
      expect(maskOpacity).toBeDefined();
      expect(typeof maskOpacity).toBe('number');
      expect(maskOpacity).toBeLessThan(1);
      expect(maskOpacity).toBeGreaterThanOrEqual(0);
    });

    it('afterOpenChange(false) resets state', () => {
      const onClose = vi.fn();
      const { result } = renderHook(() =>
        useSwipeToDismiss({ placement: 'bottom', onClose }),
      );

      // First trigger a dismiss
      act(() => {
        capturedSwipeableConfig.onSwiping({ deltaX: 0, deltaY: 200, dir: 'Down' });
      });
      act(() => {
        capturedSwipeableConfig.onSwiped({ deltaX: 0, deltaY: 200, dir: 'Down' });
      });

      // Now simulate afterOpenChange(false) — drawer has closed
      act(() => {
        result.current.afterOpenChange(false);
      });

      expect(result.current.dragOffset).toBe(0);
    });

    it('blocks further swipes once dismiss has started', () => {
      const onClose = vi.fn();
      const { result } = renderHook(() =>
        useSwipeToDismiss({ placement: 'bottom', onClose }),
      );

      // Trigger dismiss
      act(() => {
        capturedSwipeableConfig.onSwiped({ deltaX: 0, deltaY: 200, dir: 'Down' });
      });

      // Try to swipe again before timer fires — should be blocked
      const offsetAfterDismiss = result.current.dragOffset;
      act(() => {
        capturedSwipeableConfig.onSwiping({ deltaX: 0, deltaY: 50, dir: 'Down' });
      });
      // Offset should not change from swiping during dismiss
      expect(result.current.dragOffset).toBe(offsetAfterDismiss);
    });

    it('respects custom threshold', () => {
      const onClose = vi.fn();
      renderHook(() =>
        useSwipeToDismiss({ placement: 'bottom', onClose, dismissThreshold: 200 }),
      );

      // Swipe 150px — below custom threshold of 200
      act(() => {
        capturedSwipeableConfig.onSwiped({ deltaX: 0, deltaY: 150, dir: 'Down' });
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(onClose).not.toHaveBeenCalled();

      // Swipe 250px — above custom threshold of 200
      act(() => {
        capturedSwipeableConfig.onSwiped({ deltaX: 0, deltaY: 250, dir: 'Down' });
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
