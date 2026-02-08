import React from 'react';
import { notFound } from 'next/navigation';
import { BoardRouteParameters } from '@/app/lib/types';
import { getBoardDetailsForBoard } from '@/app/lib/board-utils';
import { parseBoardRouteParamsWithSlugs } from '@/app/lib/url-utils.server';
import { Metadata } from 'next';
import LibraryViewContent from './library-view-content';
import styles from './library.module.css';


export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Your Library | Boardsesh',
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
        <LibraryViewContent
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
