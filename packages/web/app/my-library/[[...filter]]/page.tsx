import React from 'react';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { Metadata } from 'next';
import { DEFAULT_BOARD_COOKIE_NAME } from '@/app/lib/default-board-cookie';
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
    // No filter segment — read default board cookie
    const cookieStore = await cookies();
    const defaultBoardUrl = cookieStore.get(DEFAULT_BOARD_COOKIE_NAME)?.value;
    if (defaultBoardUrl) {
      const decoded = decodeURIComponent(defaultBoardUrl);
      // URL looks like /kilter/... — extract board name from first segment
      const firstSegment = decoded.split('/').filter(Boolean)[0];
      if (firstSegment && VALID_FILTERS.includes(firstSegment)) {
        boardFilter = firstSegment;
      }
    }
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
