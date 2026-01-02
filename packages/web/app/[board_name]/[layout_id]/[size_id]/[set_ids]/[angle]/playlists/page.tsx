import React from 'react';
import { notFound } from 'next/navigation';
import { BoardRouteParameters } from '@/app/lib/types';
import { getBoardDetails } from '@/app/lib/__generated__/product-sizes-data';
import { parseBoardRouteParamsWithSlugs } from '@/app/lib/url-utils.server';
import { Metadata } from 'next';
import PlaylistsListContent from './playlists-list-content';
import styles from './playlists.module.css';

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
    const boardDetails = await getBoardDetails(parsedParams);

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
