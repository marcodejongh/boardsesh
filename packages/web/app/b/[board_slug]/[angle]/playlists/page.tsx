import React from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { resolveBoardBySlug } from '@/app/lib/board-slug-utils';
import LibraryPageContent from '@/app/playlists/library-page-content';
import styles from '@/app/components/library/library.module.css';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Playlists | Boardsesh',
    description: 'View and manage your climb playlists',
  };
}

interface PlaylistsPageProps {
  params: Promise<{ board_slug: string; angle: string }>;
}

export default async function BoardSlugPlaylistsPage(props: PlaylistsPageProps) {
  const params = await props.params;

  const board = await resolveBoardBySlug(params.board_slug);
  if (!board) {
    return notFound();
  }

  return (
    <div className={styles.pageContainer}>
      <LibraryPageContent boardSlug={params.board_slug} boardAngle={Number(params.angle)} />
    </div>
  );
}
