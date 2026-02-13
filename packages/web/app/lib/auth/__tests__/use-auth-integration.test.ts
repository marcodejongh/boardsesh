import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mockUseSession = vi.fn();
vi.mock('next-auth/react', () => ({
  useSession: () => mockUseSession(),
}));

const mockCreateMapping = vi.fn();
vi.mock('../user-board-mappings', () => ({
  createUserBoardMapping: (...args: unknown[]) => mockCreateMapping(...args),
}));

import { useAuthIntegration } from '../use-auth-integration';

describe('useAuthIntegration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSession.mockReturnValue({ data: null });
  });

  it('returns isAuthenticated=false when no session', () => {
    mockUseSession.mockReturnValue({ data: null });

    const { result } = renderHook(() => useAuthIntegration());

    expect(result.current.isAuthenticated).toBe(false);
  });

  it('returns isAuthenticated=true when session exists', () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: 'user-1', name: 'Test User' } },
    });

    const { result } = renderHook(() => useAuthIntegration());

    expect(result.current.isAuthenticated).toBe(true);
  });

  it('returns userId from session', () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: 'user-42', name: 'Test User' } },
    });

    const { result } = renderHook(() => useAuthIntegration());

    expect(result.current.userId).toBe('user-42');
  });

  it('linkBoardAccount warns when not authenticated', async () => {
    mockUseSession.mockReturnValue({ data: null });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { result } = renderHook(() => useAuthIntegration());

    await act(async () => {
      await result.current.linkBoardAccount('kilter', 123, 'testuser');
    });

    expect(warnSpy).toHaveBeenCalledWith(
      'Cannot link board account: user not authenticated with NextAuth',
    );
    expect(mockCreateMapping).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('linkBoardAccount calls createUserBoardMapping with correct args', async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: 'user-1', name: 'Test User' } },
    });
    mockCreateMapping.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuthIntegration());

    await act(async () => {
      await result.current.linkBoardAccount('kilter', 456, 'boarduser');
    });

    expect(mockCreateMapping).toHaveBeenCalledWith('user-1', 'kilter', 456, 'boarduser');
  });

  it('linkBoardAccount catches and logs errors', async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: 'user-1', name: 'Test User' } },
    });
    const testError = new Error('Mapping failed');
    mockCreateMapping.mockRejectedValue(testError);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useAuthIntegration());

    await act(async () => {
      await result.current.linkBoardAccount('tension', 789, 'anotheruser');
    });

    expect(errorSpy).toHaveBeenCalledWith('Failed to link board account:', testError);
    errorSpy.mockRestore();
  });

  it('does not throw on mapping failure', async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: 'user-1', name: 'Test User' } },
    });
    mockCreateMapping.mockRejectedValue(new Error('Network error'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useAuthIntegration());

    // Should not throw
    await expect(
      act(async () => {
        await result.current.linkBoardAccount('kilter', 100, 'user');
      }),
    ).resolves.toBeUndefined();

    vi.restoreAllMocks();
  });
});
