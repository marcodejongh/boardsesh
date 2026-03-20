import React from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { resolveBoardBySlug } from '@/app/lib/board-slug-utils';
import { constructBoardSlugPlaylistsUrl } from '@/app/lib/url-utils';
import { getServerAuthToken } from '@/app/lib/auth/server-auth';
import { serverMyBoards, serverUserPlaylists, cachedDiscoverPlaylists } from '@/app/lib/graphql/server-cached-client';
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

  // SSR: fetch boards, playlists, and discover data in parallel
  const authToken = await getServerAuthToken();
  const playlistFilter = { boardType: board.boardType, layoutId: board.layoutId };

  const [initialMyBoards, initialPlaylists, initialDiscoverPlaylists] = await Promise.all([
    authToken ? serverMyBoards(authToken) : null,
    authToken ? serverUserPlaylists(authToken, playlistFilter) : null,
    cachedDiscoverPlaylists(playlistFilter),
  ]);

  return (
    <div className={styles.pageContainer}>
      <LibraryPageContent
        boardSlug={params.board_slug}
        playlistsBasePath={constructBoardSlugPlaylistsUrl(params.board_slug, Number(params.angle))}
        initialMyBoards={initialMyBoards}
        initialPlaylists={initialPlaylists}
        initialDiscoverPlaylists={initialDiscoverPlaylists}
      />
    </div>
  );
}
