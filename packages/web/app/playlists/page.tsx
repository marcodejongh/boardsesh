import React from 'react';
import { getServerSession } from 'next-auth/next';
import { Metadata } from 'next';
import { authOptions } from '@/app/lib/auth/auth-options';
import PlaylistsListContent from './playlists-list-content';
import styles from './playlists.module.css';

export const metadata: Metadata = {
  title: 'My Playlists | Boardsesh',
  description: 'View and manage your climb playlists',
};

export default async function PlaylistsPage() {
  const session = await getServerSession(authOptions);

  return (
    <div className={styles.pageContainer}>
      <PlaylistsListContent currentUserId={session?.user?.id} />
    </div>
  );
}
