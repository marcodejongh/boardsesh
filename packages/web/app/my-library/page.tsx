import React from 'react';
import { Metadata } from 'next';
import LibraryPageContent from './library-page-content';
import styles from '@/app/components/library/library.module.css';

export const metadata: Metadata = {
  title: 'Your Library | Boardsesh',
  description: 'View and manage your climb playlists',
};

export default async function MyLibraryPage() {
  return (
    <div className={styles.pageContainer}>
      <LibraryPageContent />
    </div>
  );
}
