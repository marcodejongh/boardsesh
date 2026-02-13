import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { useColorMode, ColorModeContext, type ColorModeContextValue } from '../use-color-mode';

function createWrapper(value: ColorModeContextValue) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(ColorModeContext.Provider, { value }, children);
  };
}

describe('useColorMode', () => {
  it('returns default context value with mode=dark', () => {
    const { result } = renderHook(() => useColorMode());

    expect(result.current.mode).toBe('dark');
  });

  it('returns default toggleMode as a function', () => {
    const { result } = renderHook(() => useColorMode());

    expect(typeof result.current.toggleMode).toBe('function');
  });

  it('default toggleMode is a no-op function', () => {
    const { result } = renderHook(() => useColorMode());

    // Should not throw
    expect(() => result.current.toggleMode()).not.toThrow();
  });

  it('returns provided context value when wrapped in provider with mode=light', () => {
    const value: ColorModeContextValue = {
      mode: 'light',
      toggleMode: () => {},
    };

    const { result } = renderHook(() => useColorMode(), {
      wrapper: createWrapper(value),
    });

    expect(result.current.mode).toBe('light');
  });

  it('toggleMode from provider is callable', () => {
    const mockToggle = vi.fn();
    const value: ColorModeContextValue = {
      mode: 'light',
      toggleMode: mockToggle,
    };

    const { result } = renderHook(() => useColorMode(), {
      wrapper: createWrapper(value),
    });

    act(() => {
      result.current.toggleMode();
    });

    expect(mockToggle).toHaveBeenCalledTimes(1);
  });

  it('reacts to context changes', () => {
    let currentMode: 'light' | 'dark' = 'light';
    const toggleMode = vi.fn(() => {
      currentMode = currentMode === 'light' ? 'dark' : 'light';
    });

    const { result, rerender } = renderHook(() => useColorMode(), {
      wrapper: createWrapper({ mode: currentMode, toggleMode }),
    });

    expect(result.current.mode).toBe('light');

    // Simulate a context change by re-rendering with a new value
    const { result: result2 } = renderHook(() => useColorMode(), {
      wrapper: createWrapper({ mode: 'dark', toggleMode }),
    });

    expect(result2.current.mode).toBe('dark');
  });
});
