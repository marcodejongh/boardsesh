import React from 'react';
import { Metadata } from 'next';
import LibraryPageContent from './library-page-content';
import styles from '@/app/components/library/library.module.css';

export const metadata: Metadata = {
  title: 'Playlists | Boardsesh',
  description: 'View and manage your climb playlists',
};

export default async function PlaylistsPage() {
  return (
    <div className={styles.pageContainer}>
      <LibraryPageContent />
    </div>
  );
}
