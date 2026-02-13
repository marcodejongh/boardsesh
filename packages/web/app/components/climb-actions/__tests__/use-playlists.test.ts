import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mockGetPlaylistsForClimb = vi.fn().mockReturnValue(new Set());
const mockAddToPlaylist = vi.fn();
const mockRemoveFromPlaylist = vi.fn();
const mockCreatePlaylist = vi.fn();
const mockRefreshPlaylists = vi.fn();

vi.mock('../playlists-batch-context', () => ({
  usePlaylistsContext: () => ({
    playlists: [{ uuid: 'pl-1', name: 'Test Playlist', climbCount: 5 }],
    getPlaylistsForClimb: mockGetPlaylistsForClimb,
    addToPlaylist: mockAddToPlaylist,
    removeFromPlaylist: mockRemoveFromPlaylist,
    createPlaylist: mockCreatePlaylist,
    isLoading: false,
    isAuthenticated: true,
    refreshPlaylists: mockRefreshPlaylists,
  }),
}));

import { usePlaylists } from '../use-playlists';

describe('usePlaylists', () => {
  const defaultOptions = { climbUuid: 'climb-1', angle: 40 };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPlaylistsForClimb.mockReturnValue(new Set());
  });

  it('returns playlists from context', () => {
    const { result } = renderHook(() => usePlaylists(defaultOptions));

    expect(result.current.playlists).toEqual([
      { uuid: 'pl-1', name: 'Test Playlist', climbCount: 5 },
    ]);
  });

  it('calls getPlaylistsForClimb with climbUuid', () => {
    renderHook(() => usePlaylists(defaultOptions));

    expect(mockGetPlaylistsForClimb).toHaveBeenCalledWith('climb-1');
  });

  it('addToPlaylist passes playlistId, climbUuid, and angle', async () => {
    const { result } = renderHook(() => usePlaylists(defaultOptions));

    await act(async () => {
      await result.current.addToPlaylist('pl-1');
    });

    expect(mockAddToPlaylist).toHaveBeenCalledWith('pl-1', 'climb-1', 40);
  });

  it('removeFromPlaylist passes playlistId and climbUuid', async () => {
    const { result } = renderHook(() => usePlaylists(defaultOptions));

    await act(async () => {
      await result.current.removeFromPlaylist('pl-1');
    });

    expect(mockRemoveFromPlaylist).toHaveBeenCalledWith('pl-1', 'climb-1');
  });

  it('createPlaylist delegates to context', async () => {
    const mockPlaylist = { uuid: 'pl-new', name: 'New Playlist', climbCount: 0 };
    mockCreatePlaylist.mockResolvedValue(mockPlaylist);

    const { result } = renderHook(() => usePlaylists(defaultOptions));

    let created;
    await act(async () => {
      created = await result.current.createPlaylist('New Playlist', 'A description', '#ff0000', 'star');
    });

    expect(mockCreatePlaylist).toHaveBeenCalledWith('New Playlist', 'A description', '#ff0000', 'star');
    expect(created).toEqual(mockPlaylist);
  });

  it('returns isLoading and isAuthenticated', () => {
    const { result } = renderHook(() => usePlaylists(defaultOptions));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('refreshPlaylists delegates to context', async () => {
    const { result } = renderHook(() => usePlaylists(defaultOptions));

    await act(async () => {
      await result.current.refreshPlaylists();
    });

    expect(mockRefreshPlaylists).toHaveBeenCalled();
  });
});
