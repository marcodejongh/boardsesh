'use client';

import { useCallback } from 'react';
import { usePlaylistsContext, type Playlist } from './playlists-batch-context';

type UsePlaylistsOptions = {
  climbUuid: string;
  angle: number;
};

type UsePlaylistsReturn = {
  playlists: Playlist[];
  playlistsContainingClimb: Set<string>;
  addToPlaylist: (playlistId: string) => Promise<void>;
  removeFromPlaylist: (playlistId: string) => Promise<void>;
  createPlaylist: (
    name: string,
    description?: string,
    color?: string,
    icon?: string
  ) => Promise<Playlist>;
  isLoading: boolean;
  isAuthenticated: boolean;
  refreshPlaylists: () => Promise<void>;
};

/**
 * Hook to manage playlist operations for a specific climb.
 */
export function usePlaylists({ climbUuid, angle }: UsePlaylistsOptions): UsePlaylistsReturn {
  const {
    playlists,
    getPlaylistsForClimb,
    addToPlaylist: addToPlaylistContext,
    removeFromPlaylist: removeFromPlaylistContext,
    createPlaylist: createPlaylistContext,
    isLoading,
    isAuthenticated,
    refreshPlaylists,
  } = usePlaylistsContext();

  const playlistsContainingClimb = getPlaylistsForClimb(climbUuid);

  const addToPlaylist = useCallback(
    async (playlistId: string): Promise<void> => {
      return addToPlaylistContext(playlistId, climbUuid, angle);
    },
    [addToPlaylistContext, climbUuid, angle]
  );

  const removeFromPlaylist = useCallback(
    async (playlistId: string): Promise<void> => {
      return removeFromPlaylistContext(playlistId, climbUuid);
    },
    [removeFromPlaylistContext, climbUuid]
  );

  return {
    playlists,
    playlistsContainingClimb,
    addToPlaylist,
    removeFromPlaylist,
    createPlaylist: createPlaylistContext,
    isLoading,
    isAuthenticated,
    refreshPlaylists,
  };
}
