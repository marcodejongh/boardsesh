import React from 'react';
import { notFound } from 'next/navigation';
import { BoardRouteParameters } from '@/app/lib/types';
import { parseBoardRouteParamsWithSlugs } from '@/app/lib/url-utils.server';
import { Metadata } from 'next';
import LibraryPageContent from '@/app/playlists/library-page-content';
import styles from '@/app/components/library/library.module.css';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Playlists | Boardsesh',
    description: 'View and manage your climb playlists',
  };
}

export default async function PlaylistsPage(props: { params: Promise<BoardRouteParameters> }) {
  const params = await props.params;

  try {
    // Validate route params (throws if invalid board/layout/size/set combination)
    await parseBoardRouteParamsWithSlugs(params);
    const playlistsBasePath = `/${params.board_name}/${params.layout_id}/${params.size_id}/${params.set_ids}/${params.angle}/playlists`;

    return (
      <div className={styles.pageContainer}>
        <LibraryPageContent
          playlistsBasePath={playlistsBasePath}
        />
      </div>
    );
  } catch (error) {
    console.error('Error loading playlists page:', error);
    notFound();
  }
}
