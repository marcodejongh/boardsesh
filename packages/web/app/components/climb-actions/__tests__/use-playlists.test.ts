import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { PlaylistsContext } from '../playlists-batch-context';
import { usePlaylists } from '../use-playlists';

// Helper to create a wrapper with PlaylistsContext.Provider
function createWrapper(contextValue: React.ContextType<typeof PlaylistsContext>) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(PlaylistsContext.Provider, { value: contextValue }, children);
  };
}

describe('usePlaylists', () => {
  const defaultOptions = { climbUuid: 'climb-1', angle: 40 };

  const mockGetPlaylistsForClimb = vi.fn().mockReturnValue(new Set());
  const mockAddToPlaylist = vi.fn();
  const mockRemoveFromPlaylist = vi.fn();
  const mockCreatePlaylist = vi.fn();
  const mockRefreshPlaylists = vi.fn();

  const testPlaylist = {
    id: '1',
    uuid: 'pl-1',
    boardType: 'kilter',
    name: 'Test Playlist',
    isPublic: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    climbCount: 5,
  };

  const defaultContext = {
    playlists: [testPlaylist],
    getPlaylistsForClimb: mockGetPlaylistsForClimb,
    addToPlaylist: mockAddToPlaylist,
    removeFromPlaylist: mockRemoveFromPlaylist,
    createPlaylist: mockCreatePlaylist,
    isLoading: false,
    isAuthenticated: true,
    refreshPlaylists: mockRefreshPlaylists,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPlaylistsForClimb.mockReturnValue(new Set());
  });

  describe('with PlaylistsProvider', () => {
    it('returns playlists from context', () => {
      const { result } = renderHook(() => usePlaylists(defaultOptions), {
        wrapper: createWrapper(defaultContext),
      });

      expect(result.current.playlists).toEqual([testPlaylist]);
    });

    it('calls getPlaylistsForClimb with climbUuid', () => {
      renderHook(() => usePlaylists(defaultOptions), {
        wrapper: createWrapper(defaultContext),
      });

      expect(mockGetPlaylistsForClimb).toHaveBeenCalledWith('climb-1');
    });

    it('addToPlaylist passes playlistId, climbUuid, and angle', async () => {
      const { result } = renderHook(() => usePlaylists(defaultOptions), {
        wrapper: createWrapper(defaultContext),
      });

      await act(async () => {
        await result.current.addToPlaylist('pl-1');
      });

      expect(mockAddToPlaylist).toHaveBeenCalledWith('pl-1', 'climb-1', 40);
    });

    it('removeFromPlaylist passes playlistId and climbUuid', async () => {
      const { result } = renderHook(() => usePlaylists(defaultOptions), {
        wrapper: createWrapper(defaultContext),
      });

      await act(async () => {
        await result.current.removeFromPlaylist('pl-1');
      });

      expect(mockRemoveFromPlaylist).toHaveBeenCalledWith('pl-1', 'climb-1');
    });

    it('createPlaylist delegates to context', async () => {
      const mockPlaylist = {
        id: '2',
        uuid: 'pl-new',
        boardType: 'kilter',
        name: 'New Playlist',
        isPublic: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        climbCount: 0,
      };
      mockCreatePlaylist.mockResolvedValue(mockPlaylist);

      const { result } = renderHook(() => usePlaylists(defaultOptions), {
        wrapper: createWrapper(defaultContext),
      });

      let created;
      await act(async () => {
        created = await result.current.createPlaylist('New Playlist', 'A description', '#ff0000', 'star');
      });

      expect(mockCreatePlaylist).toHaveBeenCalledWith('New Playlist', 'A description', '#ff0000', 'star');
      expect(created).toEqual(mockPlaylist);
    });

    it('returns isLoading and isAuthenticated', () => {
      const { result } = renderHook(() => usePlaylists(defaultOptions), {
        wrapper: createWrapper(defaultContext),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('refreshPlaylists delegates to context', async () => {
      const { result } = renderHook(() => usePlaylists(defaultOptions), {
        wrapper: createWrapper(defaultContext),
      });

      await act(async () => {
        await result.current.refreshPlaylists();
      });

      expect(mockRefreshPlaylists).toHaveBeenCalled();
    });
  });

  describe('without PlaylistsProvider', () => {
    it('returns safe defaults when no PlaylistsProvider is present', () => {
      const { result } = renderHook(() => usePlaylists(defaultOptions));

      expect(result.current.playlists).toEqual([]);
      expect(result.current.playlistsContainingClimb).toEqual(new Set());
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('addToPlaylist is a no-op when no provider', async () => {
      const { result } = renderHook(() => usePlaylists(defaultOptions));

      // Should not throw
      await act(async () => {
        await result.current.addToPlaylist('pl-1');
      });
    });

    it('removeFromPlaylist is a no-op when no provider', async () => {
      const { result } = renderHook(() => usePlaylists(defaultOptions));

      // Should not throw
      await act(async () => {
        await result.current.removeFromPlaylist('pl-1');
      });
    });

    it('createPlaylist returns empty playlist when no provider', async () => {
      const { result } = renderHook(() => usePlaylists(defaultOptions));

      let created;
      await act(async () => {
        created = await result.current.createPlaylist('Test');
      });

      expect(created).toEqual({
        id: '',
        uuid: '',
        boardType: '',
        name: '',
        isPublic: false,
        createdAt: '',
        updatedAt: '',
        climbCount: 0,
      });
    });

    it('refreshPlaylists is a no-op when no provider', async () => {
      const { result } = renderHook(() => usePlaylists(defaultOptions));

      // Should not throw
      await act(async () => {
        await result.current.refreshPlaylists();
      });
    });

    it('does not throw when rendered without provider', () => {
      expect(() => {
        renderHook(() => usePlaylists(defaultOptions));
      }).not.toThrow();
    });
  });
});
