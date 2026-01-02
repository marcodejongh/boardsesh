import React from 'react';
import { getServerSession } from 'next-auth/next';
import { Metadata } from 'next';
import { authOptions } from '@/app/lib/auth/auth-options';
import PlaylistViewContent from './playlist-view-content';
import styles from './playlist-view.module.css';

export const metadata: Metadata = {
  title: 'Playlist | Boardsesh',
  description: 'View playlist details and climbs',
};

type PlaylistViewPageParams = {
  playlist_uuid: string;
};

export default async function PlaylistViewPage(props: { params: Promise<PlaylistViewPageParams> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);

  return (
    <div className={styles.pageContainer}>
      <PlaylistViewContent
        playlistUuid={params.playlist_uuid}
        currentUserId={session?.user?.id}
      />
    </div>
  );
}
