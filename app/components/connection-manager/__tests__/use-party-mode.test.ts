import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { usePartyMode, ConnectionSettingsProvider } from '../connection-settings-context';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(() => ({
    get: vi.fn(() => null),
  })),
}));

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(ConnectionSettingsProvider, null, children);

describe('usePartyMode', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should default to direct mode', () => {
    const { result } = renderHook(() => usePartyMode(), { wrapper });

    expect(result.current.partyMode).toBe('direct');
  });

  it('should load mode from localStorage', async () => {
    localStorage.setItem('boardsesh:partyMode', 'daemon');

    const { result, rerender } = renderHook(() => usePartyMode(), { wrapper });

    await act(async () => {
      rerender();
    });

    expect(result.current.partyMode).toBe('daemon');
  });

  it('should set party mode and persist to localStorage', async () => {
    const { result } = renderHook(() => usePartyMode(), { wrapper });

    await act(async () => {
      result.current.setPartyMode('daemon');
    });

    expect(result.current.partyMode).toBe('daemon');
    expect(localStorage.getItem('boardsesh:partyMode')).toBe('daemon');
  });

  it('should switch between modes', async () => {
    const { result } = renderHook(() => usePartyMode(), { wrapper });

    // Switch to daemon
    await act(async () => {
      result.current.setPartyMode('daemon');
    });
    expect(result.current.partyMode).toBe('daemon');

    // Switch back to direct
    await act(async () => {
      result.current.setPartyMode('direct');
    });
    expect(result.current.partyMode).toBe('direct');
  });

  it('should default to direct for invalid stored value', async () => {
    localStorage.setItem('boardsesh:partyMode', 'invalid');

    const { result, rerender } = renderHook(() => usePartyMode(), { wrapper });

    await act(async () => {
      rerender();
    });

    expect(result.current.partyMode).toBe('direct');
  });
});

describe('usePartyMode with daemon URL', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should sync mode to daemon when daemonUrl is present in URL', async () => {
    // Mock searchParams to return daemonUrl
    const { useSearchParams } = await import('next/navigation');
    vi.mocked(useSearchParams).mockReturnValue({
      get: vi.fn((key: string) => {
        if (key === 'daemonUrl') return 'ws://localhost:8080';
        return null;
      }),
    } as unknown as ReturnType<typeof useSearchParams>);

    const { result, rerender } = renderHook(() => usePartyMode(), { wrapper });

    await act(async () => {
      rerender();
    });

    // The hook should force daemon mode when URL param is present
    expect(result.current.partyMode).toBe('daemon');
  });
});
