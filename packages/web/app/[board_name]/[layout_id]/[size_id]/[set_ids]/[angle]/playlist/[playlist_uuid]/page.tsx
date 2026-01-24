import React from 'react';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { BoardRouteParameters, BoardDetails, ParsedBoardRouteParameters } from '@/app/lib/types';
import { getBoardDetails } from '@/app/lib/__generated__/product-sizes-data';
import { getMoonBoardDetails } from '@/app/lib/moonboard-config';
import { parseBoardRouteParamsWithSlugs } from '@/app/lib/url-utils.server';
import { Metadata } from 'next';
import { authOptions } from '@/app/lib/auth/auth-options';
import PlaylistViewContent from './playlist-view-content';
import styles from './playlist-view.module.css';

// Helper to get board details for any board type
function getBoardDetailsForBoard(params: ParsedBoardRouteParameters): BoardDetails {
  if (params.board_name === 'moonboard') {
    return getMoonBoardDetails({
      layout_id: params.layout_id,
      set_ids: params.set_ids,
    });
  }
  return getBoardDetails(params);
}

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
