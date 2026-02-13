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

// Mock useSwipeDirection
const mockDetect = vi.fn();
const mockReset = vi.fn();
const mockIsHorizontalRef = { current: null as boolean | null };
vi.mock('../use-swipe-direction', () => ({
  useSwipeDirection: () => ({
    detect: mockDetect,
    reset: mockReset,
    isHorizontalRef: mockIsHorizontalRef,
  }),
}));

import { useSwipeActions, type UseSwipeActionsOptions } from '../use-swipe-actions';

function createDefaultOptions(): UseSwipeActionsOptions {
  return {
    onSwipeLeft: vi.fn(),
    onSwipeRight: vi.fn(),
  };
}

describe('useSwipeActions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    capturedSwipeableConfig = {};
    mockDetect.mockReset();
    mockReset.mockReset();
    mockIsHorizontalRef.current = null;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns swipeHandlers, isSwipeComplete, contentRef, leftActionRef, rightActionRef', () => {
    const { result } = renderHook(() => useSwipeActions(createDefaultOptions()));

    expect(result.current.swipeHandlers).toBeDefined();
    expect(result.current.isSwipeComplete).toBe(false);
    expect(typeof result.current.contentRef).toBe('function');
    expect(typeof result.current.leftActionRef).toBe('function');
    expect(typeof result.current.rightActionRef).toBe('function');
  });

  it('does nothing when disabled', () => {
    const options = { ...createDefaultOptions(), disabled: true };
    renderHook(() => useSwipeActions(options));

    act(() => {
      capturedSwipeableConfig.onSwiping({
        deltaX: -150,
        deltaY: 0,
        event: { preventDefault: vi.fn(), nativeEvent: { preventDefault: vi.fn() } },
      });
    });

    expect(mockDetect).not.toHaveBeenCalled();
  });

  it('calls onSwipeLeft when swiped left past threshold and detected horizontal', () => {
    const options = createDefaultOptions();
    renderHook(() => useSwipeActions(options));

    // Set direction to horizontal
    mockIsHorizontalRef.current = true;
    mockDetect.mockReturnValue(true);

    // Simulate swiping
    act(() => {
      capturedSwipeableConfig.onSwiping({
        deltaX: -110,
        deltaY: 0,
        event: { nativeEvent: { preventDefault: vi.fn() } },
      });
    });

    // Trigger onSwipedLeft with sufficient delta
    act(() => {
      capturedSwipeableConfig.onSwipedLeft({ deltaX: -110 });
    });

    // Wait for the completion animation timeout (default 200ms)
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(options.onSwipeLeft).toHaveBeenCalledTimes(1);
  });

  it('calls onSwipeRight when swiped right past threshold and detected horizontal', () => {
    const options = createDefaultOptions();
    renderHook(() => useSwipeActions(options));

    mockIsHorizontalRef.current = true;
    mockDetect.mockReturnValue(true);

    act(() => {
      capturedSwipeableConfig.onSwiping({
        deltaX: 110,
        deltaY: 0,
        event: { nativeEvent: { preventDefault: vi.fn() } },
      });
    });

    act(() => {
      capturedSwipeableConfig.onSwipedRight({ deltaX: 110 });
    });

    expect(options.onSwipeRight).toHaveBeenCalledTimes(1);
  });

  it('snaps back when swipe below threshold', () => {
    const options = createDefaultOptions();
    renderHook(() => useSwipeActions(options));

    mockIsHorizontalRef.current = true;
    mockDetect.mockReturnValue(true);

    act(() => {
      capturedSwipeableConfig.onSwiping({
        deltaX: -40,
        deltaY: 0,
        event: { nativeEvent: { preventDefault: vi.fn() } },
      });
    });

    act(() => {
      capturedSwipeableConfig.onSwipedLeft({ deltaX: -40 });
    });

    // onSwipeLeft should not be called since delta < threshold
    expect(options.onSwipeLeft).not.toHaveBeenCalled();
    // resetDirection should be called
    expect(mockReset).toHaveBeenCalled();
  });

  it('isSwipeComplete becomes true during left swipe animation', () => {
    const options = createDefaultOptions();
    const { result } = renderHook(() => useSwipeActions(options));

    mockIsHorizontalRef.current = true;
    mockDetect.mockReturnValue(true);

    expect(result.current.isSwipeComplete).toBe(false);

    act(() => {
      capturedSwipeableConfig.onSwiping({
        deltaX: -110,
        deltaY: 0,
        event: { nativeEvent: { preventDefault: vi.fn() } },
      });
    });

    act(() => {
      capturedSwipeableConfig.onSwipedLeft({ deltaX: -110 });
    });

    // During the animation, isSwipeComplete should be true
    expect(result.current.isSwipeComplete).toBe(true);

    // After animation completes
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current.isSwipeComplete).toBe(false);
  });

  it('does not trigger action for vertical swipes (isHorizontalRef.current = false)', () => {
    const options = createDefaultOptions();
    renderHook(() => useSwipeActions(options));

    mockIsHorizontalRef.current = false;
    mockDetect.mockReturnValue(false);

    act(() => {
      capturedSwipeableConfig.onSwiping({
        deltaX: -110,
        deltaY: 0,
        event: { nativeEvent: { preventDefault: vi.fn() } },
      });
    });

    act(() => {
      capturedSwipeableConfig.onSwipedLeft({ deltaX: -110 });
    });

    // Should snap back, not trigger action
    expect(options.onSwipeLeft).not.toHaveBeenCalled();
  });

  it('onTouchEndOrOnMouseUp resets if below threshold', () => {
    const options = createDefaultOptions();
    renderHook(() => useSwipeActions(options));

    mockIsHorizontalRef.current = true;
    mockDetect.mockReturnValue(true);

    // Swipe a small amount
    act(() => {
      capturedSwipeableConfig.onSwiping({
        deltaX: 30,
        deltaY: 0,
        event: { nativeEvent: { preventDefault: vi.fn() } },
      });
    });

    // Touch end
    act(() => {
      capturedSwipeableConfig.onTouchEndOrOnMouseUp();
    });

    expect(mockReset).toHaveBeenCalled();
  });

  it('DOM refs apply transform via contentRef callback', () => {
    const { result } = renderHook(() => useSwipeActions(createDefaultOptions()));

    const mockElement = {
      style: { transform: '', transition: '', opacity: '', visibility: '' },
    } as unknown as HTMLElement;

    // Set the content ref
    act(() => {
      result.current.contentRef(mockElement);
    });

    mockDetect.mockReturnValue(true);
    mockIsHorizontalRef.current = true;

    // Simulate swiping to trigger applyOffset
    act(() => {
      capturedSwipeableConfig.onSwiping({
        deltaX: 50,
        deltaY: 0,
        event: { nativeEvent: { preventDefault: vi.fn() } },
      });
    });

    expect(mockElement.style.transform).toBe('translateX(50px)');
  });

  it('respects custom swipeThreshold', () => {
    const options = { ...createDefaultOptions(), swipeThreshold: 50 };
    renderHook(() => useSwipeActions(options));

    mockIsHorizontalRef.current = true;
    mockDetect.mockReturnValue(true);

    // Swipe just past the custom threshold
    act(() => {
      capturedSwipeableConfig.onSwiping({
        deltaX: -60,
        deltaY: 0,
        event: { nativeEvent: { preventDefault: vi.fn() } },
      });
    });

    act(() => {
      capturedSwipeableConfig.onSwipedLeft({ deltaX: -60 });
    });

    // Wait for the animation
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(options.onSwipeLeft).toHaveBeenCalledTimes(1);
  });

  it('respects custom maxSwipe (clamps offset)', () => {
    const options = { ...createDefaultOptions(), maxSwipe: 80 };
    const { result } = renderHook(() => useSwipeActions(options));

    const mockElement = {
      style: { transform: '', transition: '', opacity: '', visibility: '' },
    } as unknown as HTMLElement;

    act(() => {
      result.current.contentRef(mockElement);
    });

    mockDetect.mockReturnValue(true);
    mockIsHorizontalRef.current = true;

    // Swipe beyond maxSwipe
    act(() => {
      capturedSwipeableConfig.onSwiping({
        deltaX: 200,
        deltaY: 0,
        event: { nativeEvent: { preventDefault: vi.fn() } },
      });
    });

    // Should be clamped to maxSwipe
    expect(mockElement.style.transform).toBe('translateX(80px)');
  });

  it('resets direction on swipe completion', () => {
    const options = createDefaultOptions();
    renderHook(() => useSwipeActions(options));

    mockIsHorizontalRef.current = true;
    mockDetect.mockReturnValue(true);

    act(() => {
      capturedSwipeableConfig.onSwiping({
        deltaX: 110,
        deltaY: 0,
        event: { nativeEvent: { preventDefault: vi.fn() } },
      });
    });

    act(() => {
      capturedSwipeableConfig.onSwipedRight({ deltaX: 110 });
    });

    expect(mockReset).toHaveBeenCalled();
  });
});
