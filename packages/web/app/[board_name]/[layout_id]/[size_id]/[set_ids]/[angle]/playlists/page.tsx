import React from 'react';
import { notFound } from 'next/navigation';
import { BoardRouteParameters, BoardDetails, ParsedBoardRouteParameters } from '@/app/lib/types';
import { getBoardDetails } from '@/app/lib/__generated__/product-sizes-data';
import { getMoonBoardDetails } from '@/app/lib/moonboard-config';
import { parseBoardRouteParamsWithSlugs } from '@/app/lib/url-utils.server';
import { Metadata } from 'next';
import PlaylistsListContent from './playlists-list-content';
import styles from './playlists.module.css';

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

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'My Playlists | Boardsesh',
    description: 'View and manage your climb playlists',
  };
}

export default async function PlaylistsListPage(props: { params: Promise<BoardRouteParameters> }) {
  const params = await props.params;

  try {
    const parsedParams = await parseBoardRouteParamsWithSlugs(params);
    const boardDetails = getBoardDetailsForBoard(parsedParams);

    return (
      <div className={styles.pageContainer}>
        <PlaylistsListContent
          boardDetails={boardDetails}
          angle={parsedParams.angle}
        />
      </div>
    );
  } catch (error) {
    console.error('Error loading playlists:', error);
    notFound();
  }
}
