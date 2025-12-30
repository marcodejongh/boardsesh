'use client';

import React, { createContext, useContext, useMemo } from 'react';

export interface Playlist {
  id: string;
  uuid: string;
  boardType: string;
  layoutId: number;
  name: string;
  description?: string;
  isPublic: boolean;
  color?: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
  climbCount: number;
  userRole?: string;
}

interface PlaylistsContextValue {
  // List of user's playlists for this board+layout
  playlists: Playlist[];
  // Check if a climb is in specific playlists (returns playlist IDs)
  getPlaylistsForClimb: (climbUuid: string) => Set<string>;
  // Add climb to playlist
  addToPlaylist: (playlistId: string, climbUuid: string, angle: number) => Promise<void>;
  // Remove climb from playlist
  removeFromPlaylist: (playlistId: string, climbUuid: string) => Promise<void>;
  // Create new playlist
  createPlaylist: (
    name: string,
    description?: string,
    color?: string,
    icon?: string
  ) => Promise<Playlist>;
  // Loading state
  isLoading: boolean;
  // Is authenticated
  isAuthenticated: boolean;
  // Refresh playlists
  refreshPlaylists: () => Promise<void>;
}

export const PlaylistsContext = createContext<PlaylistsContextValue | null>(null);

interface PlaylistsProviderProps {
  playlists: Playlist[];
  playlistMemberships: Map<string, Set<string>>; // climbUuid -> Set<playlistId>
  addToPlaylist: (playlistId: string, climbUuid: string, angle: number) => Promise<void>;
  removeFromPlaylist: (playlistId: string, climbUuid: string) => Promise<void>;
  createPlaylist: (
    name: string,
    description?: string,
    color?: string,
    icon?: string
  ) => Promise<Playlist>;
  isLoading: boolean;
  isAuthenticated: boolean;
  refreshPlaylists: () => Promise<void>;
  children: React.ReactNode;
}

/**
 * Provider that passes hoisted playlist data to child components.
 * Similar to FavoritesProvider pattern.
 */
export function PlaylistsProvider({
  playlists,
  playlistMemberships,
  addToPlaylist,
  removeFromPlaylist,
  createPlaylist,
  isLoading,
  isAuthenticated,
  refreshPlaylists,
  children,
}: PlaylistsProviderProps) {
  const getPlaylistsForClimb = useMemo(
    () => (climbUuid: string) => {
      return playlistMemberships.get(climbUuid) || new Set<string>();
    },
    [playlistMemberships]
  );

  const value = useMemo<PlaylistsContextValue>(
    () => ({
      playlists,
      getPlaylistsForClimb,
      addToPlaylist,
      removeFromPlaylist,
      createPlaylist,
      isLoading,
      isAuthenticated,
      refreshPlaylists,
    }),
    [
      playlists,
      getPlaylistsForClimb,
      addToPlaylist,
      removeFromPlaylist,
      createPlaylist,
      isLoading,
      isAuthenticated,
      refreshPlaylists,
    ]
  );

  return <PlaylistsContext.Provider value={value}>{children}</PlaylistsContext.Provider>;
}

/**
 * Hook to access playlists data from context.
 * Must be used within a PlaylistsProvider.
 */
export function usePlaylistsContext(): PlaylistsContextValue {
  const context = useContext(PlaylistsContext);
  if (!context) {
    throw new Error('usePlaylistsContext must be used within a PlaylistsProvider');
  }
  return context;
}
