import React from 'react';
import { BoardRouteParameters } from '@/app/lib/types';
import { getBoardDetails } from '@/app/lib/__generated__/product-sizes-data';
import { parseBoardRouteParams } from '@/app/lib/url-utils';
import { parseBoardRouteParamsWithSlugs } from '@/app/lib/url-utils.server';
import CreateClimbForm from '@/app/components/create-climb/create-climb-form';
import {
  MOONBOARD_LAYOUTS,
  MOONBOARD_SETS,
  MoonBoardLayoutKey,
} from '@/app/lib/moonboard-config';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create Climb | Boardsesh',
  description: 'Create a new climb on your climbing board',
};

interface CreateClimbPageProps {
  params: Promise<BoardRouteParameters>;
  searchParams: Promise<{ forkFrames?: string; forkName?: string }>;
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

export default async function CreateClimbPage(props: CreateClimbPageProps) {
  const [params, searchParams] = await Promise.all([props.params, props.searchParams]);

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

  // Handle MoonBoard separately (no database, different renderer)
  if (parsedParams.board_name === 'moonboard') {
    const layoutInfo = getMoonBoardLayoutInfo(parsedParams.layout_id);
    if (!layoutInfo) {
      return <div>Invalid MoonBoard layout</div>;
    }

    const holdSetImages = getMoonBoardHoldSetImages(layoutInfo.layoutKey, parsedParams.set_ids);

    return (
      <CreateClimbForm
        boardType="moonboard"
        angle={parsedParams.angle}
        layoutFolder={layoutInfo.folder}
        layoutId={parsedParams.layout_id}
        holdSetImages={holdSetImages}
      />
    );
  }

  // Aurora boards (kilter, tension) - use database
  const boardDetails = await getBoardDetails(parsedParams);

  return (
    <CreateClimbForm
      boardType="aurora"
      angle={parsedParams.angle}
      boardDetails={boardDetails}
      forkFrames={searchParams.forkFrames}
      forkName={searchParams.forkName}
    />
  );
}
