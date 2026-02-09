import React from 'react';
import { PropsWithChildren } from 'react';
import { notFound } from 'next/navigation';
import { BoardDetails } from '@/app/lib/types';
import { resolveBoardBySlug, boardToRouteParams } from '@/app/lib/board-slug-utils';
import { getBoardDetails } from '@/app/lib/__generated__/product-sizes-data';
import { getMoonBoardDetails } from '@/app/lib/moonboard-config';
import PlayLayoutClient from '@/app/[board_name]/[layout_id]/[size_id]/[set_ids]/[angle]/play/layout-client';

interface LayoutProps {
  params: Promise<{ board_slug: string; angle: string }>;
}

export default async function BoardSlugPlayLayout(props: PropsWithChildren<LayoutProps>) {
  const params = await props.params;
  const { children } = props;

  const board = await resolveBoardBySlug(params.board_slug);
  if (!board) {
    return notFound();
  }

  const parsedParams = boardToRouteParams(board, Number(params.angle));

  let boardDetails: BoardDetails;
  if (parsedParams.board_name === 'moonboard') {
    boardDetails = getMoonBoardDetails(parsedParams);
  } else {
    boardDetails = getBoardDetails(parsedParams);
  }

  return <PlayLayoutClient boardDetails={boardDetails}>{children}</PlayLayoutClient>;
}
