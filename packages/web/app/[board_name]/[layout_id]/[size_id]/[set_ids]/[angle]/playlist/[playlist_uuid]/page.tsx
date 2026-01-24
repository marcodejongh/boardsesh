import React from 'react';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { BoardRouteParameters, BoardDetails, ParsedBoardRouteParameters } from '@/app/lib/types';
import { getBoardDetailsForBoard } from '@/app/lib/board-utils';
import { parseBoardRouteParamsWithSlugs } from '@/app/lib/url-utils.server';
import { Metadata } from 'next';
import { authOptions } from '@/app/lib/auth/auth-options';
import PlaylistViewContent from './playlist-view-content';
import styles from './playlist-view.module.css';


type PlaylistRouteParameters = BoardRouteParameters & {
  playlist_uuid: string;
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Playlist | Boardsesh',
    description: 'View playlist details and climbs',
  };
}

export default async function PlaylistViewPage(props: { params: Promise<PlaylistRouteParameters> }) {
  const params = await props.params;

  try {
    const parsedParams = await parseBoardRouteParamsWithSlugs(params);
    const boardDetails = getBoardDetailsForBoard(parsedParams);

    // Get auth session for ownership check
    const session = await getServerSession(authOptions);

    return (
      <div className={styles.pageContainer}>
        <PlaylistViewContent
          playlistUuid={params.playlist_uuid}
          boardDetails={boardDetails}
          angle={parsedParams.angle}
          currentUserId={session?.user?.id}
        />
      </div>
    );
  } catch (error) {
    console.error('Error loading playlist view:', error);
    notFound();
  }
}
