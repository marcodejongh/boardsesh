import React from 'react';
import { Metadata } from 'next';
import { getServerAuthToken } from '@/app/lib/auth/server-auth';
import { serverMyBoards, serverUserPlaylists, cachedDiscoverPlaylists } from '@/app/lib/graphql/server-cached-client';
import LibraryPageContent from './library-page-content';
import styles from '@/app/components/library/library.module.css';

export const metadata: Metadata = {
  title: 'Playlists | Boardsesh',
  description: 'View and manage your climb playlists',
};

export default async function PlaylistsPage() {
  // SSR: fetch boards, playlists (unfiltered), and discover data in parallel
  const authToken = await getServerAuthToken();

  const [initialMyBoards, initialPlaylists, initialDiscoverPlaylists] = await Promise.all([
    authToken ? serverMyBoards(authToken) : null,
    authToken ? serverUserPlaylists(authToken) : null,
    cachedDiscoverPlaylists(),
  ]);

  return (
    <div className={styles.pageContainer}>
      <LibraryPageContent
        initialMyBoards={initialMyBoards}
        initialPlaylists={initialPlaylists}
        initialDiscoverPlaylists={initialDiscoverPlaylists}
      />
    </div>
  );
}
