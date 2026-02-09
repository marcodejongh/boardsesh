import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { resolveBoardBySlug, boardToRouteParams } from '@/app/lib/board-slug-utils';
import { constructBoardSlugListUrl } from '@/app/lib/url-utils';
import MoonBoardBulkImport from '@/app/components/moonboard-import/moonboard-bulk-import';
import {
  MOONBOARD_LAYOUTS,
  MOONBOARD_SETS,
  MoonBoardLayoutKey,
} from '@/app/lib/moonboard-config';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Import Climbs | Boardsesh',
  description: 'Import MoonBoard climbs from screenshots',
};

function getMoonBoardLayoutInfo(layoutId: number) {
  const entry = Object.entries(MOONBOARD_LAYOUTS).find(([, layout]) => layout.id === layoutId);
  if (!entry) return null;
  const [layoutKey, layout] = entry;
  return { layoutKey: layoutKey as MoonBoardLayoutKey, ...layout };
}

function getMoonBoardHoldSetImages(layoutKey: MoonBoardLayoutKey, setIds: number[]): string[] {
  const sets = MOONBOARD_SETS[layoutKey] || [];
  return sets.filter((s) => setIds.includes(s.id)).map((s) => s.imageFile);
}

interface ImportPageProps {
  params: Promise<{ board_slug: string; angle: string }>;
}

export default async function BoardSlugImportPage(props: ImportPageProps) {
  const params = await props.params;

  const board = await resolveBoardBySlug(params.board_slug);
  if (!board) {
    return notFound();
  }

  const parsedParams = boardToRouteParams(board, Number(params.angle));

  // Only MoonBoard supports bulk import
  if (parsedParams.board_name !== 'moonboard') {
    redirect(constructBoardSlugListUrl(board.slug, parsedParams.angle));
  }

  const layoutInfo = getMoonBoardLayoutInfo(parsedParams.layout_id);
  if (!layoutInfo) {
    return <div>Invalid MoonBoard layout</div>;
  }

  const holdSetImages = getMoonBoardHoldSetImages(layoutInfo.layoutKey, parsedParams.set_ids);

  return (
    <MoonBoardBulkImport
      layoutFolder={layoutInfo.folder}
      layoutName={layoutInfo.name}
      layoutId={parsedParams.layout_id}
      holdSetImages={holdSetImages}
      angle={parsedParams.angle}
    />
  );
}
