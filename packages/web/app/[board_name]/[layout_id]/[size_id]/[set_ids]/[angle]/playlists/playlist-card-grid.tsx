'use client';

import React from 'react';
import Skeleton from '@mui/material/Skeleton';
import { Playlist } from '@/app/lib/graphql/operations/playlists';
import PlaylistCard from './playlist-card';
import styles from './library.module.css';

type PlaylistCardGridProps = {
  playlists: Playlist[];
  selectedBoard: string;
  getPlaylistUrl: (uuid: string) => string;
  loading?: boolean;
};

export default function PlaylistCardGrid({
  playlists,
  selectedBoard,
  getPlaylistUrl,
  loading,
}: PlaylistCardGridProps) {
  if (loading) {
    return (
      <div className={styles.cardGrid}>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className={styles.skeletonCompact}>
            <Skeleton variant="rounded" width={48} height={48} />
            <div className={styles.skeletonCompactText}>
              <Skeleton variant="text" width="80%" />
              <Skeleton variant="text" width="50%" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Filter by selected board
  const filtered = selectedBoard === 'all'
    ? playlists
    : playlists.filter((p) => p.boardType === selectedBoard);

  // Show up to 8 playlists
  const display = filtered.slice(0, 8);

  if (display.length === 0) {
    return null;
  }

  return (
    <div className={styles.cardGrid}>
      {display.map((playlist, index) => (
        <PlaylistCard
          key={playlist.uuid}
          name={playlist.name}
          climbCount={playlist.climbCount}
          color={playlist.color}
          href={getPlaylistUrl(playlist.uuid)}
          variant="grid"
          index={index}
        />
      ))}
    </div>
  );
}
