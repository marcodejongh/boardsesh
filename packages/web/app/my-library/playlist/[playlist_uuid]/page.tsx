import React from 'react';
import { Metadata } from 'next';
import PlaylistDetailContent from './playlist-detail-content';
import styles from '@/app/components/library/playlist-view.module.css';

export const metadata: Metadata = {
  title: 'Playlist | Boardsesh',
  description: 'View playlist details and climbs',
};

export default async function PlaylistDetailPage({
  params,
}: {
  params: Promise<{ playlist_uuid: string }>;
}) {
  const { playlist_uuid } = await params;

  return (
    <div className={styles.pageContainer}>
      <PlaylistDetailContent playlistUuid={playlist_uuid} />
    </div>
  );
}
