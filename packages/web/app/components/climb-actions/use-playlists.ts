'use client';

import { useCallback, useContext } from 'react';
import { PlaylistsContext, type Playlist } from './playlists-batch-context';

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

const emptySet = new Set<string>();
const noopAsync = async () => {};
const noopCreatePlaylist = async (): Promise<Playlist> => {
  return {
    id: '',
    uuid: '',
    boardType: '',
    name: '',
    isPublic: false,
    createdAt: '',
    updatedAt: '',
    climbCount: 0,
  };
};

/**
 * Hook to manage playlist operations for a specific climb.
 *
 * When rendered outside a PlaylistsProvider (e.g. on the home page proposals feed),
 * returns safe defaults — playlist actions will be unavailable but won't crash.
 */
export function usePlaylists({ climbUuid, angle }: UsePlaylistsOptions): UsePlaylistsReturn {
  const context = useContext(PlaylistsContext);

  const addToPlaylist = useCallback(
    async (playlistId: string): Promise<void> => {
      if (!context) return;
      return context.addToPlaylist(playlistId, climbUuid, angle);
    },
    [context, climbUuid, angle]
  );

  const removeFromPlaylist = useCallback(
    async (playlistId: string): Promise<void> => {
      if (!context) return;
      return context.removeFromPlaylist(playlistId, climbUuid);
    },
    [context, climbUuid]
  );

  if (!context) {
    return {
      playlists: [],
      playlistsContainingClimb: emptySet,
      addToPlaylist: noopAsync,
      removeFromPlaylist: noopAsync,
      createPlaylist: noopCreatePlaylist,
      isLoading: false,
      isAuthenticated: false,
      refreshPlaylists: noopAsync,
    };
  }

  return {
    playlists: context.playlists,
    playlistsContainingClimb: context.getPlaylistsForClimb(climbUuid),
    addToPlaylist,
    removeFromPlaylist,
    createPlaylist: context.createPlaylist,
    isLoading: context.isLoading,
    isAuthenticated: context.isAuthenticated,
    refreshPlaylists: context.refreshPlaylists,
  };
}
