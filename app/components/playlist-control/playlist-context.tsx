"use client";

import { BoulderProblem, SearchRequest, SearchRequestPagination } from "@/app/lib/types";
import { useSearchParams } from "next/navigation";
import { createContext, useContext, useState, ReactNode } from "react";

// Define the shape of the playlist object
interface Playlist {
  id: string;
  name: string;
  tracks: string[];
  currentTrack: string;
  searchParams: SearchRequestPagination;
}

// Define the context value structure
interface PlaylistContextType {
  playlist: Playlist | null;
  setPlaylist: (playlist: Playlist) => void;
  nextTrack: () => void;
  addToPlaylist: (track: string) => void;
  setClimbSearchParams: (searchParams: SearchRequestPagination) => void;
  climbSearchParams: SearchRequestPagination;
  currentClimb: BoulderProblem;
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
  const [currentClimbState, setCurrentClimbState] = useState<BoulderProblem | null>(null);

  const searchParams = useSearchParams();
  const [ climbSearchParams, setClimbSearchParams ] = useState<SearchRequest>({
    gradeAccuracy: parseFloat(searchParams.get("gradeAccuracy") || "0"),
    maxGrade: parseInt(searchParams.get("maxGrade") || "29", 10),
    minAscents: parseInt(searchParams.get("minAscents") || "0", 10),
    minGrade: parseInt(searchParams.get("minGrade") || "1", 10),
    minRating: parseFloat(searchParams.get("minRating") || "0"),
    sortBy: (searchParams.get("sortBy") || "ascents") as "ascents" | "difficulty" | "name" | "quality",
    sortOrder: (searchParams.get("sortOrder") || "desc") as "asc" | "desc",
    name: searchParams.get("name") || "",
    onlyClassics: searchParams.get("onlyClassics") === "true",
    settername: searchParams.get("settername") || "",
    setternameSuggestion: searchParams.get("setternameSuggestion") || "",
    holds: searchParams.get("holds") || "",
    mirroredHolds: searchParams.get("mirroredHolds") || "",
  });

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

  const setCurrentClimb = (climb: BoulderProblem) => {
    setCurrentClimbState(climb);
  }

  return (
    <PlaylistContext.Provider value={{ playlist, setPlaylist, nextTrack, addToPlaylist, setClimbSearchParams, climbSearchParams, setCurrentClimb, currentClimbState }}>
      {children}
    </PlaylistContext.Provider>
  );
};
