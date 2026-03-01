import React from 'react';
import { notFound } from 'next/navigation';
import { BoardRouteParameters } from '@/app/lib/types';
import { parseBoardRouteParamsWithSlugs } from '@/app/lib/url-utils.server';
import { Metadata } from 'next';
import PlaylistDetailContent from '@/app/playlists/[playlist_uuid]/playlist-detail-content';
import styles from '@/app/components/library/playlist-view.module.css';

export const metadata: Metadata = {
  title: 'Playlist | Boardsesh',
  description: 'View playlist details and climbs',
};

type PlaylistDetailRouteParams = BoardRouteParameters & {
  playlist_uuid: string;
};

export default async function PlaylistDetailPage(props: {
  params: Promise<PlaylistDetailRouteParams>;
}) {
  const params = await props.params;

  try {
    await parseBoardRouteParamsWithSlugs(params);
    const playlistsBasePath = `/${params.board_name}/${params.layout_id}/${params.size_id}/${params.set_ids}/${params.angle}/playlists`;

    return (
      <div className={styles.pageContainer}>
        <PlaylistDetailContent
          playlistUuid={params.playlist_uuid}
          playlistsBasePath={playlistsBasePath}
        />
      </div>
    );
  } catch (error) {
    console.error('Error loading playlist detail page:', error);
    notFound();
  }
}
