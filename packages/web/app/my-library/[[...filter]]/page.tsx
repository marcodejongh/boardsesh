import React from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import LibraryPageContent from './library-page-content';
import styles from '@/app/components/library/library.module.css';

const VALID_FILTERS = ['all', 'kilter', 'tension', 'moonboard'];

export const metadata: Metadata = {
  title: 'Your Library | Boardsesh',
  description: 'View and manage your climb playlists',
};

export default async function MyLibraryPage({
  params,
}: {
  params: Promise<{ filter?: string[] }>;
}) {
  const { filter } = await params;

  let boardFilter: string | undefined;

  if (!filter || filter.length === 0) {
    // No filter segment — show all playlists
  } else if (filter.length === 1 && VALID_FILTERS.includes(filter[0])) {
    boardFilter = filter[0];
  } else {
    notFound();
  }

  return (
    <div className={styles.pageContainer}>
      <LibraryPageContent boardFilter={boardFilter} />
    </div>
  );
}
