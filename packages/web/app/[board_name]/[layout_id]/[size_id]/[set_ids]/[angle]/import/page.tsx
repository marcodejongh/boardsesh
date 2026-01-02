import React from 'react';
import { BoardRouteParameters } from '@/app/lib/types';
import { parseBoardRouteParams } from '@/app/lib/url-utils';
import { parseBoardRouteParamsWithSlugs } from '@/app/lib/url-utils.server';
import MoonBoardBulkImport from '@/app/components/moonboard-import/moonboard-bulk-import';
import {
  MOONBOARD_LAYOUTS,
  MOONBOARD_SETS,
  MoonBoardLayoutKey,
} from '@/app/lib/moonboard-config';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Import Climbs | Boardsesh',
  description: 'Import MoonBoard climbs from screenshots',
};

interface ImportPageProps {
  params: Promise<BoardRouteParameters>;
}

// Helper to get MoonBoard layout info from layout ID
function getMoonBoardLayoutInfo(layoutId: number) {
  const entry = Object.entries(MOONBOARD_LAYOUTS).find(([, layout]) => layout.id === layoutId);
  if (!entry) return null;
  const [layoutKey, layout] = entry;
  return { layoutKey: layoutKey as MoonBoardLayoutKey, ...layout };
}

// Helper to get MoonBoard hold set images from set IDs
function getMoonBoardHoldSetImages(layoutKey: MoonBoardLayoutKey, setIds: number[]): string[] {
  const sets = MOONBOARD_SETS[layoutKey] || [];
  return sets.filter((s) => setIds.includes(s.id)).map((s) => s.imageFile);
}

export default async function ImportPage(props: ImportPageProps) {
  const params = await props.params;

  // Check if any parameters are in numeric format (old URLs)
  const hasNumericParams = [params.layout_id, params.size_id, params.set_ids].some((param) =>
    param.includes(',') ? param.split(',').every((id) => /^\d+$/.test(id.trim())) : /^\d+$/.test(param),
  );

  let parsedParams;

  if (hasNumericParams) {
    parsedParams = parseBoardRouteParams(params);
  } else {
    parsedParams = await parseBoardRouteParamsWithSlugs(params);
  }

  // Only MoonBoard supports bulk import for now
  if (parsedParams.board_name !== 'moonboard') {
    // Redirect to the board's climb list page
    redirect(`/${params.board_name}/${params.layout_id}/${params.size_id}/${params.set_ids}/${params.angle}`);
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
      holdSetImages={holdSetImages}
      angle={parsedParams.angle}
    />
  );
}
