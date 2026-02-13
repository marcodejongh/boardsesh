import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mockIsFavorited = vi.fn();
const mockToggleFavorite = vi.fn();

vi.mock('../favorites-batch-context', () => ({
  useFavoritesContext: () => ({
    isFavorited: mockIsFavorited,
    toggleFavorite: mockToggleFavorite,
    isLoading: false,
    isAuthenticated: true,
  }),
}));

import { useFavorite } from '../use-favorite';

describe('useFavorite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsFavorited.mockReturnValue(false);
    mockToggleFavorite.mockResolvedValue(true);
  });

  it('calls isFavorited with climbUuid', () => {
    renderHook(() => useFavorite({ climbUuid: 'climb-123' }));

    expect(mockIsFavorited).toHaveBeenCalledWith('climb-123');
  });

  it('calls toggleFavorite with climbUuid when toggle invoked', async () => {
    const { result } = renderHook(() => useFavorite({ climbUuid: 'climb-123' }));

    await act(async () => {
      await result.current.toggleFavorite();
    });

    expect(mockToggleFavorite).toHaveBeenCalledWith('climb-123');
  });

  it('returns isLoading from context', () => {
    const { result } = renderHook(() => useFavorite({ climbUuid: 'climb-123' }));

    expect(result.current.isLoading).toBe(false);
  });

  it('returns isAuthenticated from context', () => {
    const { result } = renderHook(() => useFavorite({ climbUuid: 'climb-123' }));

    expect(result.current.isAuthenticated).toBe(true);
  });

  it('returns isFavorited result for the specific climb', () => {
    mockIsFavorited.mockReturnValue(true);

    const { result } = renderHook(() => useFavorite({ climbUuid: 'climb-123' }));

    expect(result.current.isFavorited).toBe(true);
  });

  it('handles different climbUuids correctly', () => {
    mockIsFavorited.mockImplementation((uuid: string) => uuid === 'climb-A');

    const { result: resultA } = renderHook(() => useFavorite({ climbUuid: 'climb-A' }));
    const { result: resultB } = renderHook(() => useFavorite({ climbUuid: 'climb-B' }));

    expect(resultA.current.isFavorited).toBe(true);
    expect(resultB.current.isFavorited).toBe(false);
    expect(mockIsFavorited).toHaveBeenCalledWith('climb-A');
    expect(mockIsFavorited).toHaveBeenCalledWith('climb-B');
  });
});
