import React from 'react';
import { notFound } from 'next/navigation';
import { resolveBoardBySlug, boardToRouteParams } from '@/app/lib/board-slug-utils';
import { getBoardDetailsForBoard } from '@/app/lib/board-utils';
import { getClimb } from '@/app/lib/data/queries';
import { convertLitUpHoldsStringToMap } from '@/app/components/board-renderer/util';
import PlayViewClient from '@/app/[board_name]/[layout_id]/[size_id]/[set_ids]/[angle]/play/[climb_uuid]/play-view-client';

interface BoardSlugPlayPageProps {
  params: Promise<{ board_slug: string; angle: string; climb_uuid: string }>;
}

export default async function BoardSlugPlayPage(props: BoardSlugPlayPageProps) {
  const params = await props.params;

  const board = await resolveBoardBySlug(params.board_slug);
  if (!board) {
    return notFound();
  }

  const parsedParams = {
    ...boardToRouteParams(board, Number(params.angle)),
    climb_uuid: params.climb_uuid,
  };

  const boardDetails = getBoardDetailsForBoard(parsedParams);

  let initialClimb = null;
  try {
    const climb = await getClimb(parsedParams);
    if (climb) {
      const litUpHoldsMap = convertLitUpHoldsStringToMap(climb.frames, parsedParams.board_name)[0];
      initialClimb = {
        ...climb,
        litUpHoldsMap,
      };
    }
  } catch {
    // Climb will be loaded from queue context on client
  }

  return (
    <PlayViewClient
      boardDetails={boardDetails}
      initialClimb={initialClimb}
      angle={parsedParams.angle}
    />
  );
}
