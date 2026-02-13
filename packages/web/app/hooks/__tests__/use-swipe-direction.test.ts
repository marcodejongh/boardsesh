import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSwipeDirection } from '../use-swipe-direction';

describe('useSwipeDirection', () => {
  it('returns null when movement is below threshold', () => {
    const { result } = renderHook(() => useSwipeDirection());

    let direction: boolean | null;
    act(() => {
      direction = result.current.detect(5, 5);
    });

    expect(direction!).toBeNull();
  });

  it('returns true (horizontal) when horizontal movement exceeds threshold', () => {
    const { result } = renderHook(() => useSwipeDirection());

    let direction: boolean | null;
    act(() => {
      direction = result.current.detect(15, 2);
    });

    expect(direction!).toBe(true);
  });

  it('returns false (vertical) when vertical movement exceeds threshold', () => {
    const { result } = renderHook(() => useSwipeDirection());

    let direction: boolean | null;
    act(() => {
      direction = result.current.detect(2, 15);
    });

    expect(direction!).toBe(false);
  });

  it('direction is sticky once locked to horizontal', () => {
    const { result } = renderHook(() => useSwipeDirection());

    // Lock to horizontal
    act(() => {
      result.current.detect(15, 2);
    });

    // Even with vertical-dominant movement, should still return horizontal
    let direction: boolean | null;
    act(() => {
      direction = result.current.detect(2, 50);
    });

    expect(direction!).toBe(true);
  });

  it('direction is sticky once locked to vertical', () => {
    const { result } = renderHook(() => useSwipeDirection());

    // Lock to vertical
    act(() => {
      result.current.detect(2, 15);
    });

    // Even with horizontal-dominant movement, should still return vertical
    let direction: boolean | null;
    act(() => {
      direction = result.current.detect(50, 2);
    });

    expect(direction!).toBe(false);
  });

  it('reset() unlocks the direction', () => {
    const { result } = renderHook(() => useSwipeDirection());

    // Lock to horizontal
    act(() => {
      result.current.detect(15, 2);
    });
    expect(result.current.isHorizontalRef.current).toBe(true);

    // Reset
    act(() => {
      result.current.reset();
    });
    expect(result.current.isHorizontalRef.current).toBeNull();

    // Now can detect vertical
    let direction: boolean | null;
    act(() => {
      direction = result.current.detect(2, 15);
    });

    expect(direction!).toBe(false);
  });

  it('equal but above-threshold movement favors vertical (absX > absY is false when equal)', () => {
    const { result } = renderHook(() => useSwipeDirection());

    let direction: boolean | null;
    act(() => {
      direction = result.current.detect(15, 15);
    });

    // absX > absY is false when they are equal, so isHorizontal = false
    expect(direction!).toBe(false);
  });

  it('negative deltas work correctly for horizontal', () => {
    const { result } = renderHook(() => useSwipeDirection());

    let direction: boolean | null;
    act(() => {
      direction = result.current.detect(-20, -3);
    });

    expect(direction!).toBe(true);
  });

  it('negative deltas work correctly for vertical', () => {
    const { result } = renderHook(() => useSwipeDirection());

    let direction: boolean | null;
    act(() => {
      direction = result.current.detect(-3, -20);
    });

    expect(direction!).toBe(false);
  });
});
