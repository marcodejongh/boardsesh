import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDoubleTap } from '../use-double-tap';

describe('useDoubleTap', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns ref and onDoubleClick', () => {
    const { result } = renderHook(() => useDoubleTap(vi.fn()));

    expect(typeof result.current.ref).toBe('function');
    expect(typeof result.current.onDoubleClick).toBe('function');
  });

  it('onDoubleClick calls callback on non-touch device', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDoubleTap(callback));

    act(() => {
      result.current.onDoubleClick();
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('onDoubleClick is no-op after touch events', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDoubleTap(callback));

    // Create a real element and attach via ref
    const element = document.createElement('div');
    act(() => {
      result.current.ref(element);
    });

    // Simulate a touch event to set isTouchDevice flag
    const touchEvent = new Event('touchend', { bubbles: true }) as TouchEvent;
    Object.defineProperty(touchEvent, 'preventDefault', { value: vi.fn() });

    act(() => {
      vi.setSystemTime(1000);
      element.dispatchEvent(touchEvent);
    });

    // Now onDoubleClick should be a no-op
    act(() => {
      result.current.onDoubleClick();
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it('double tap within threshold triggers callback', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDoubleTap(callback));

    const element = document.createElement('div');
    act(() => {
      result.current.ref(element);
    });

    // First tap
    act(() => {
      vi.setSystemTime(1000);
      const touchEvent1 = new Event('touchend', { bubbles: true }) as TouchEvent;
      Object.defineProperty(touchEvent1, 'preventDefault', { value: vi.fn() });
      element.dispatchEvent(touchEvent1);
    });

    // Second tap within threshold (< 300ms)
    act(() => {
      vi.setSystemTime(1200);
      const touchEvent2 = new Event('touchend', { bubbles: true }) as TouchEvent;
      Object.defineProperty(touchEvent2, 'preventDefault', { value: vi.fn() });
      element.dispatchEvent(touchEvent2);
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('single tap does not trigger callback', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDoubleTap(callback));

    const element = document.createElement('div');
    act(() => {
      result.current.ref(element);
    });

    act(() => {
      vi.setSystemTime(1000);
      const touchEvent = new Event('touchend', { bubbles: true }) as TouchEvent;
      Object.defineProperty(touchEvent, 'preventDefault', { value: vi.fn() });
      element.dispatchEvent(touchEvent);
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it('taps beyond threshold do not trigger callback', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDoubleTap(callback));

    const element = document.createElement('div');
    act(() => {
      result.current.ref(element);
    });

    // First tap
    act(() => {
      vi.setSystemTime(1000);
      const touchEvent1 = new Event('touchend', { bubbles: true }) as TouchEvent;
      Object.defineProperty(touchEvent1, 'preventDefault', { value: vi.fn() });
      element.dispatchEvent(touchEvent1);
    });

    // Second tap beyond threshold (>= 300ms)
    act(() => {
      vi.setSystemTime(1400);
      const touchEvent2 = new Event('touchend', { bubbles: true }) as TouchEvent;
      Object.defineProperty(touchEvent2, 'preventDefault', { value: vi.fn() });
      element.dispatchEvent(touchEvent2);
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it('callback undefined does not throw', () => {
    const { result } = renderHook(() => useDoubleTap(undefined));

    const element = document.createElement('div');
    act(() => {
      result.current.ref(element);
    });

    // Should not throw when dispatching touch events with undefined callback
    expect(() => {
      act(() => {
        vi.setSystemTime(1000);
        const touchEvent = new Event('touchend', { bubbles: true }) as TouchEvent;
        Object.defineProperty(touchEvent, 'preventDefault', { value: vi.fn() });
        element.dispatchEvent(touchEvent);
      });
    }).not.toThrow();

    // onDoubleClick should also not throw
    expect(() => {
      act(() => {
        result.current.onDoubleClick();
      });
    }).not.toThrow();
  });

  it('ref attaches touchend listener on mount and detaches on unmount', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDoubleTap(callback));

    const element = document.createElement('div');
    const addSpy = vi.spyOn(element, 'addEventListener');
    const removeSpy = vi.spyOn(element, 'removeEventListener');

    // Attach
    act(() => {
      result.current.ref(element);
    });

    expect(addSpy).toHaveBeenCalledWith('touchend', expect.any(Function), { passive: false });

    // Detach by passing null
    act(() => {
      result.current.ref(null);
    });

    expect(removeSpy).toHaveBeenCalledWith('touchend', expect.any(Function));
  });

  it('ref detaches old element listener when attaching to new element', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDoubleTap(callback));

    const element1 = document.createElement('div');
    const element2 = document.createElement('div');
    const removeSpy1 = vi.spyOn(element1, 'removeEventListener');
    const addSpy2 = vi.spyOn(element2, 'addEventListener');

    act(() => {
      result.current.ref(element1);
    });

    act(() => {
      result.current.ref(element2);
    });

    expect(removeSpy1).toHaveBeenCalledWith('touchend', expect.any(Function));
    expect(addSpy2).toHaveBeenCalledWith('touchend', expect.any(Function), { passive: false });
  });
});
