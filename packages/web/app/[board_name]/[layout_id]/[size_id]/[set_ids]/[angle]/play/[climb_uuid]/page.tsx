import React from 'react';
import { BoardRouteParametersWithUuid, ParsedBoardRouteParameters } from '@/app/lib/types';
import { parseBoardRouteParams, extractUuidFromSlug } from '@/app/lib/url-utils';
import { parseBoardRouteParamsWithSlugs } from '@/app/lib/url-utils.server';
import { getBoardDetails } from '@/app/lib/__generated__/product-sizes-data';
import { getClimb } from '@/app/lib/data/queries';
import { convertLitUpHoldsStringToMap } from '@/app/components/board-renderer/util';
import PlayViewClient from './play-view-client';
import { Metadata } from 'next';

export async function generateMetadata(props: { params: Promise<BoardRouteParametersWithUuid> }): Promise<Metadata> {
  const params = await props.params;

  try {
    const parsedParams = await parseBoardRouteParamsWithSlugs(params);
    const [boardDetails, currentClimb] = await Promise.all([getBoardDetails(parsedParams), getClimb(parsedParams)]);

    const climbName = currentClimb.name || `${boardDetails.board_name} Climb`;
    const climbGrade = currentClimb.difficulty || 'Unknown Grade';

    return {
      title: `${climbName} - ${climbGrade} | Play Mode | Boardsesh`,
    };
  } catch {
    return {
      title: 'Play Mode | Boardsesh',
    };
  }
}

export default async function PlayPage(props: {
  params: Promise<BoardRouteParametersWithUuid>;
}): Promise<React.JSX.Element> {
  const params = await props.params;

  // Check if any parameters are in numeric format (old URLs)
  const hasNumericParams = [params.layout_id, params.size_id, params.set_ids].some((param) =>
    param.includes(',') ? param.split(',').every((id) => /^\d+$/.test(id.trim())) : /^\d+$/.test(param),
  );

  let parsedParams;

  if (hasNumericParams) {
    parsedParams = parseBoardRouteParams({
      ...params,
      climb_uuid: extractUuidFromSlug(params.climb_uuid),
    });
  } else {
    parsedParams = await parseBoardRouteParamsWithSlugs(params);
  }

  const boardDetails = await getBoardDetails(parsedParams);

  // Try to get the initial climb for SSR
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
