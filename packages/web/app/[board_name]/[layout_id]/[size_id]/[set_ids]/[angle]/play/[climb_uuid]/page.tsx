import React from 'react';
import { BoardRouteParametersWithUuid } from '@/app/lib/types';
import { constructPlayUrlWithSlugs } from '@/app/lib/url-utils';
import { parseRouteParams } from '@/app/lib/url-utils.server';
import { getBoardDetailsForBoard } from '@/app/lib/board-utils';
import { getClimb } from '@/app/lib/data/queries';
import { convertLitUpHoldsStringToMap } from '@/app/components/board-renderer/util';
import PlayViewClient from './play-view-client';
import { Metadata } from 'next';


export async function generateMetadata(props: { params: Promise<BoardRouteParametersWithUuid> }): Promise<Metadata> {
  const params = await props.params;

  try {
    const { parsedParams } = await parseRouteParams(params);
    const [boardDetails, currentClimb] = await Promise.all([getBoardDetailsForBoard(parsedParams), getClimb(parsedParams)]);

    const climbName = currentClimb.name || `${boardDetails.board_name} Climb`;
    const climbGrade = currentClimb.difficulty || 'Unknown Grade';
    const setter = currentClimb.setter_username || 'Unknown Setter';
    const description = `${climbName} - ${climbGrade} by ${setter}. Quality: ${currentClimb.quality_average || 0}/5. Ascents: ${currentClimb.ascensionist_count || 0}`;

    // Construct the play URL for OG
    const playUrl =
      boardDetails.layout_name && boardDetails.size_name && boardDetails.set_names
        ? constructPlayUrlWithSlugs(
            parsedParams.board_name,
            boardDetails.layout_name,
            boardDetails.size_name,
            boardDetails.size_description,
            boardDetails.set_names,
            parsedParams.angle,
            parsedParams.climb_uuid,
            currentClimb.name,
          )
        : `/${parsedParams.board_name}/${parsedParams.layout_id}/${parsedParams.size_id}/${parsedParams.set_ids.join(',')}/${parsedParams.angle}/play/${parsedParams.climb_uuid}`;

    // Generate OG image URL - use parsed numeric IDs for better performance
    const ogImageUrl = new URL('/api/og/climb', 'https://boardsesh.com');
    ogImageUrl.searchParams.set('board_name', parsedParams.board_name);
    ogImageUrl.searchParams.set('layout_id', parsedParams.layout_id.toString());
    ogImageUrl.searchParams.set('size_id', parsedParams.size_id.toString());
    ogImageUrl.searchParams.set('set_ids', parsedParams.set_ids.join(','));
    ogImageUrl.searchParams.set('angle', parsedParams.angle.toString());
    ogImageUrl.searchParams.set('climb_uuid', parsedParams.climb_uuid);

    return {
      title: `${climbName} - ${climbGrade} | Play Mode | Boardsesh`,
      description,
      openGraph: {
        title: `${climbName} - ${climbGrade}`,
        description,
        type: 'website',
        url: playUrl,
        images: [
          {
            url: ogImageUrl.toString(),
            width: 1200,
            height: 630,
            alt: `${climbName} - ${climbGrade} on ${boardDetails.board_name} board`,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: `${climbName} - ${climbGrade}`,
        description,
        images: [ogImageUrl.toString()],
      },
    };
  } catch {
    return {
      title: 'Play Mode | Boardsesh',
      description: 'Play climbing routes in fullscreen mode',
    };
  }
}

export default async function PlayPage(props: {
  params: Promise<BoardRouteParametersWithUuid>;
}): Promise<React.JSX.Element> {
  const params = await props.params;

  const { parsedParams } = await parseRouteParams(params);

  const boardDetails = getBoardDetailsForBoard(parsedParams);

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
