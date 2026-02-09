import React from 'react';
import { notFound } from 'next/navigation';
import { resolveBoardBySlug, boardToRouteParams } from '@/app/lib/board-slug-utils';
import { getBoardDetailsForBoard } from '@/app/lib/board-utils';
import { Metadata } from 'next';
import LikedClimbsViewContent from '@/app/[board_name]/[layout_id]/[size_id]/[set_ids]/[angle]/liked/liked-climbs-view-content';
import styles from '@/app/components/library/playlist-view.module.css';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Liked Climbs | Boardsesh',
    description: 'View your liked climbs',
  };
}

interface LikedPageProps {
  params: Promise<{ board_slug: string; angle: string }>;
}

export default async function BoardSlugLikedPage(props: LikedPageProps) {
  const params = await props.params;

  const board = await resolveBoardBySlug(params.board_slug);
  if (!board) {
    return notFound();
  }

  try {
    const parsedParams = boardToRouteParams(board, Number(params.angle));
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
