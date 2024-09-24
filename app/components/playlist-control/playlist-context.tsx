"use client";

import { createContext, useContext, useState, ReactNode } from "react";

// Define the shape of the playlist object
interface Playlist {
  id: string;
  name: string;
  tracks: string[];
  currentTrack: string;
}

// Define the context value structure
interface PlaylistContextType {
  playlist: Playlist | null;
  setPlaylist: (playlist: Playlist) => void;
  nextTrack: () => void;
  addToPlaylist: (track: string) => void;
}

// Create the context
const PlaylistContext = createContext<PlaylistContextType | undefined>(undefined);

// Hook to use the playlist context
export const usePlaylistContext = () => {
  const context = useContext(PlaylistContext);
  if (!context) {
    throw new Error("usePlaylistContext must be used within a PlaylistProvider");
  }
  return context;
};

// Provider component with utility functions
export const PlaylistProvider = ({ children }: { children: ReactNode }) => {
  const [playlist, setPlaylist] = useState<Playlist | null>(null);

  const nextTrack = () => {
    if (playlist && playlist.tracks.length > 0) {
      const currentIndex = playlist.tracks.indexOf(playlist.currentTrack);
      const nextIndex = (currentIndex + 1) % playlist.tracks.length; // loop to start
      setPlaylist({
        ...playlist,
        currentTrack: playlist.tracks[nextIndex],
      });
    }
  };

  const addToPlaylist = (track: string) => {
    if (playlist) {
      setPlaylist({
        ...playlist,
        tracks: [...playlist.tracks, track],
      });
    }
  };

  return (
    <PlaylistContext.Provider value={{ playlist, setPlaylist, nextTrack, addToPlaylist }}>
      {children}
    </PlaylistContext.Provider>
  );
};
