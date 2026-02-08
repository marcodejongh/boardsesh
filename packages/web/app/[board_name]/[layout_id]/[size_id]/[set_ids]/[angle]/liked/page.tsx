import React from 'react';
import { notFound } from 'next/navigation';
import { BoardRouteParameters } from '@/app/lib/types';
import { getBoardDetailsForBoard } from '@/app/lib/board-utils';
import { parseBoardRouteParamsWithSlugs } from '@/app/lib/url-utils.server';
import { Metadata } from 'next';
import LikedClimbsViewContent from './liked-climbs-view-content';
import styles from '../playlist/[playlist_uuid]/playlist-view.module.css';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Liked Climbs | Boardsesh',
    description: 'View your liked climbs',
  };
}

export default async function LikedClimbsPage(props: { params: Promise<BoardRouteParameters> }) {
  const params = await props.params;

  try {
    const parsedParams = await parseBoardRouteParamsWithSlugs(params);
    const boardDetails = getBoardDetailsForBoard(parsedParams);

    return (
      <div className={styles.pageContainer}>
        <LikedClimbsViewContent
          boardDetails={boardDetails}
          angle={parsedParams.angle}
        />
      </div>
    );
  } catch (error) {
    console.error('Error loading liked climbs page:', error);
    notFound();
  }
}
