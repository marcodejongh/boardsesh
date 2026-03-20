import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebouncedValue } from '../use-debounced-value';

describe('useDebouncedValue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebouncedValue('hello', 300));

    expect(result.current).toBe('hello');
  });

  it('does not update value before delay has elapsed', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: 'hello' } },
    );

    rerender({ value: 'world' });

    // Advance time but not enough
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current).toBe('hello');
  });

  it('updates value after delay has elapsed', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: 'hello' } },
    );

    rerender({ value: 'world' });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe('world');
  });

  it('resets the timer on rapid successive changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: 'a' } },
    );

    rerender({ value: 'b' });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Change again before first debounce fires
    rerender({ value: 'c' });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // 'b' should never have been emitted
    expect(result.current).toBe('a');

    // Now let the final debounce fire
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toBe('c');
  });

  it('works with numeric values', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 100),
      { initialProps: { value: 0 } },
    );

    rerender({ value: 42 });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toBe(42);
  });

  it('works with object values', () => {
    const obj1 = { key: 'value1' };
    const obj2 = { key: 'value2' };

    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 200),
      { initialProps: { value: obj1 } },
    );

    rerender({ value: obj2 });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current).toBe(obj2);
  });

  it('handles delay of 0', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 0),
      { initialProps: { value: 'initial' } },
    );

    rerender({ value: 'updated' });

    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(result.current).toBe('updated');
  });

  it('cleans up timer on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

    const { unmount, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: 'hello' } },
    );

    rerender({ value: 'world' });
    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it('handles changing the delay value', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebouncedValue(value, delay),
      { initialProps: { value: 'hello', delay: 300 } },
    );

    rerender({ value: 'world', delay: 100 });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toBe('world');
  });
});
