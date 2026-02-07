import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Capture the config passed to useSwipeable
let capturedSwipeableConfig: Record<string, any> = {};
vi.mock('react-swipeable', () => ({
  useSwipeable: (config: Record<string, any>) => {
    capturedSwipeableConfig = config;
    return { ref: vi.fn() };
  },
}));

import {
  useCardSwipeNavigation,
  EXIT_DURATION,
  SNAP_BACK_DURATION,
} from '../use-card-swipe-navigation';

function createDefaultOptions() {
  return {
    onSwipeNext: vi.fn(),
    onSwipePrevious: vi.fn(),
    canSwipeNext: true,
    canSwipePrevious: true,
  };
}

describe('useCardSwipeNavigation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    capturedSwipeableConfig = {};
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('exported constants', () => {
    it('EXIT_DURATION is 300', () => {
      expect(EXIT_DURATION).toBe(300);
    });

    it('SNAP_BACK_DURATION is 200', () => {
      expect(SNAP_BACK_DURATION).toBe(200);
    });
  });

  describe('direction detection', () => {
    it('sets horizontal mode when first movement >10px horizontal', () => {
      const { result } = renderHook(() => useCardSwipeNavigation(createDefaultOptions()));

      // First call — determining direction with >10px horizontal
      act(() => {
        capturedSwipeableConfig.onSwiping({ deltaX: 15, deltaY: 2 });
      });
      // Direction determined, second call should update offset
      act(() => {
        capturedSwipeableConfig.onSwiping({ deltaX: 30, deltaY: 2 });
      });

      expect(result.current.swipeOffset).toBe(30);
    });

    it('sets vertical mode when first movement >10px vertical', () => {
      const { result } = renderHook(() => useCardSwipeNavigation(createDefaultOptions()));

      // First call — determining direction with >10px vertical
      act(() => {
        capturedSwipeableConfig.onSwiping({ deltaX: 2, deltaY: 15 });
      });
      // Direction determined as vertical, second call should not update offset
      act(() => {
        capturedSwipeableConfig.onSwiping({ deltaX: 30, deltaY: 20 });
      });

      expect(result.current.swipeOffset).toBe(0);
    });

    it('does not commit direction when movement <10px in both axes', () => {
      const { result } = renderHook(() => useCardSwipeNavigation(createDefaultOptions()));

      act(() => {
        capturedSwipeableConfig.onSwiping({ deltaX: 5, deltaY: 5 });
      });

      expect(result.current.swipeOffset).toBe(0);
    });
  });

  describe('threshold-based completion', () => {
    it('calls onSwipeNext when swiped left >= threshold', () => {
      const options = createDefaultOptions();
      renderHook(() => useCardSwipeNavigation(options));

      // Commit horizontal direction
      act(() => {
        capturedSwipeableConfig.onSwiping({ deltaX: -15, deltaY: 0 });
      });

      act(() => {
        capturedSwipeableConfig.onSwipedLeft({ deltaX: -100 });
      });

      expect(options.onSwipeNext).toHaveBeenCalledTimes(1);
    });

    it('calls onSwipePrevious when swiped right >= threshold', () => {
      const options = createDefaultOptions();
      renderHook(() => useCardSwipeNavigation(options));

      act(() => {
        capturedSwipeableConfig.onSwiping({ deltaX: 15, deltaY: 0 });
      });

      act(() => {
        capturedSwipeableConfig.onSwipedRight({ deltaX: 100 });
      });

      expect(options.onSwipePrevious).toHaveBeenCalledTimes(1);
    });

    it('snaps back when left swipe < threshold', () => {
      const options = createDefaultOptions();
      const { result } = renderHook(() => useCardSwipeNavigation(options));

      act(() => {
        capturedSwipeableConfig.onSwiping({ deltaX: -15, deltaY: 0 });
      });
      act(() => {
        capturedSwipeableConfig.onSwiping({ deltaX: -40, deltaY: 0 });
      });
      expect(result.current.swipeOffset).toBe(-40);

      act(() => {
        capturedSwipeableConfig.onSwipedLeft({ deltaX: -40 });
      });

      expect(result.current.swipeOffset).toBe(0);
      expect(options.onSwipeNext).not.toHaveBeenCalled();
    });

    it('snaps back when right swipe < threshold', () => {
      const options = createDefaultOptions();
      const { result } = renderHook(() => useCardSwipeNavigation(options));

      act(() => {
        capturedSwipeableConfig.onSwiping({ deltaX: 15, deltaY: 0 });
      });
      act(() => {
        capturedSwipeableConfig.onSwiping({ deltaX: 40, deltaY: 0 });
      });

      act(() => {
        capturedSwipeableConfig.onSwipedRight({ deltaX: 40 });
      });

      expect(result.current.swipeOffset).toBe(0);
      expect(options.onSwipePrevious).not.toHaveBeenCalled();
    });
  });

  describe('boundary constraints', () => {
    it('constrains leftward offset to 0 when canSwipeNext is false', () => {
      const options = { ...createDefaultOptions(), canSwipeNext: false };
      const { result } = renderHook(() => useCardSwipeNavigation(options));

      // Commit horizontal
      act(() => {
        capturedSwipeableConfig.onSwiping({ deltaX: -15, deltaY: 0 });
      });
      // Try swiping left
      act(() => {
        capturedSwipeableConfig.onSwiping({ deltaX: -50, deltaY: 0 });
      });

      expect(result.current.swipeOffset).toBe(0);
    });

    it('constrains rightward offset to 0 when canSwipePrevious is false', () => {
      const options = { ...createDefaultOptions(), canSwipePrevious: false };
      const { result } = renderHook(() => useCardSwipeNavigation(options));

      // Commit horizontal
      act(() => {
        capturedSwipeableConfig.onSwiping({ deltaX: 15, deltaY: 0 });
      });
      // Try swiping right
      act(() => {
        capturedSwipeableConfig.onSwiping({ deltaX: 50, deltaY: 0 });
      });

      expect(result.current.swipeOffset).toBe(0);
    });
  });

  describe('animation modes', () => {
    it('fires callback immediately when delayNavigation is false', () => {
      const options = { ...createDefaultOptions(), delayNavigation: false };
      renderHook(() => useCardSwipeNavigation(options));

      act(() => {
        capturedSwipeableConfig.onSwiping({ deltaX: -15, deltaY: 0 });
      });
      act(() => {
        capturedSwipeableConfig.onSwipedLeft({ deltaX: -100 });
      });

      // Should be called immediately, not after timeout
      expect(options.onSwipeNext).toHaveBeenCalledTimes(1);
    });

    it('fires callback after CLIP_EXIT_DURATION when delayNavigation is true', () => {
      const options = { ...createDefaultOptions(), delayNavigation: true };
      renderHook(() => useCardSwipeNavigation(options));

      act(() => {
        capturedSwipeableConfig.onSwiping({ deltaX: -15, deltaY: 0 });
      });
      act(() => {
        capturedSwipeableConfig.onSwipedLeft({ deltaX: -100 });
      });

      // Not called yet
      expect(options.onSwipeNext).not.toHaveBeenCalled();

      // Advance by CLIP_EXIT_DURATION (100ms)
      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(options.onSwipeNext).toHaveBeenCalledTimes(1);
    });
  });

  describe('animation blocking', () => {
    it('ignores second swipe during animation', () => {
      const options = createDefaultOptions();
      renderHook(() => useCardSwipeNavigation(options));

      // First swipe triggers animation
      act(() => {
        capturedSwipeableConfig.onSwiping({ deltaX: -15, deltaY: 0 });
      });
      act(() => {
        capturedSwipeableConfig.onSwipedLeft({ deltaX: -100 });
      });
      expect(options.onSwipeNext).toHaveBeenCalledTimes(1);

      // Second swipe during animation should be ignored
      act(() => {
        capturedSwipeableConfig.onSwiping({ deltaX: 15, deltaY: 0 });
      });
      act(() => {
        capturedSwipeableConfig.onSwipedRight({ deltaX: 100 });
      });
      expect(options.onSwipePrevious).not.toHaveBeenCalled();
    });
  });

  describe('enter direction', () => {
    it('sets enterDirection to from-right after left swipe with delayNavigation', () => {
      const options = { ...createDefaultOptions(), delayNavigation: true };
      const { result } = renderHook(() => useCardSwipeNavigation(options));

      act(() => {
        capturedSwipeableConfig.onSwiping({ deltaX: -15, deltaY: 0 });
      });
      act(() => {
        capturedSwipeableConfig.onSwipedLeft({ deltaX: -100 });
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current.enterDirection).toBe('from-right');
    });

    it('sets enterDirection to from-left after right swipe with delayNavigation', () => {
      const options = { ...createDefaultOptions(), delayNavigation: true };
      const { result } = renderHook(() => useCardSwipeNavigation(options));

      act(() => {
        capturedSwipeableConfig.onSwiping({ deltaX: 15, deltaY: 0 });
      });
      act(() => {
        capturedSwipeableConfig.onSwipedRight({ deltaX: 100 });
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current.enterDirection).toBe('from-left');
    });
  });

  describe('prop changes during animation', () => {
    it('ignores canSwipeNext changing to false during exit animation', () => {
      const options = createDefaultOptions();
      const { result, rerender } = renderHook(
        (props) => useCardSwipeNavigation(props),
        { initialProps: options },
      );

      // Commit horizontal direction
      act(() => {
        capturedSwipeableConfig.onSwiping({ deltaX: -15, deltaY: 0 });
      });

      // Trigger left swipe past threshold (starts exit animation)
      act(() => {
        capturedSwipeableConfig.onSwipedLeft({ deltaX: -100 });
      });

      expect(options.onSwipeNext).toHaveBeenCalledTimes(1);
      expect(result.current.isAnimating).toBe(true);

      // Change canSwipeNext to false during animation
      rerender({ ...options, canSwipeNext: false });

      // Animation should still be in progress (callback was already called)
      expect(result.current.isAnimating).toBe(true);

      // Let the animation complete
      act(() => {
        vi.advanceTimersByTime(EXIT_DURATION);
      });

      expect(result.current.isAnimating).toBe(false);
    });

    it('respects canSwipeNext changing to false before swipe completes', () => {
      const options = createDefaultOptions();
      const { result, rerender } = renderHook(
        (props) => useCardSwipeNavigation(props),
        { initialProps: options },
      );

      // Commit horizontal direction
      act(() => {
        capturedSwipeableConfig.onSwiping({ deltaX: -15, deltaY: 0 });
      });

      // Start swiping left (below threshold)
      act(() => {
        capturedSwipeableConfig.onSwiping({ deltaX: -40, deltaY: 0 });
      });
      expect(result.current.swipeOffset).toBe(-40);

      // Change canSwipeNext to false before swipe completes
      rerender({ ...options, canSwipeNext: false });

      // Next swiping event should constrain offset to 0
      act(() => {
        capturedSwipeableConfig.onSwiping({ deltaX: -50, deltaY: 0 });
      });

      expect(result.current.swipeOffset).toBe(0);
    });
  });

  describe('reset and clear', () => {
    it('resetSwipe resets all state to initial', () => {
      const options = createDefaultOptions();
      const { result } = renderHook(() => useCardSwipeNavigation(options));

      // Create some state
      act(() => {
        capturedSwipeableConfig.onSwiping({ deltaX: -15, deltaY: 0 });
      });
      act(() => {
        capturedSwipeableConfig.onSwiping({ deltaX: -50, deltaY: 0 });
      });

      act(() => {
        result.current.resetSwipe();
      });

      expect(result.current.swipeOffset).toBe(0);
      expect(result.current.isAnimating).toBe(false);
      expect(result.current.animationDirection).toBeNull();
    });

    it('clearEnterAnimation clears enterDirection', () => {
      const options = { ...createDefaultOptions(), delayNavigation: true };
      const { result } = renderHook(() => useCardSwipeNavigation(options));

      // Trigger a swipe to set enterDirection
      act(() => {
        capturedSwipeableConfig.onSwiping({ deltaX: -15, deltaY: 0 });
      });
      act(() => {
        capturedSwipeableConfig.onSwipedLeft({ deltaX: -100 });
      });
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(result.current.enterDirection).toBe('from-right');

      act(() => {
        result.current.clearEnterAnimation();
      });

      expect(result.current.enterDirection).toBeNull();
    });
  });
});
