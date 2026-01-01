import React from 'react';
import { BoardRouteParameters, ParsedBoardRouteParameters, BoardDetails } from '@/app/lib/types';
import { getBoardDetails } from '@/app/lib/__generated__/product-sizes-data';
import { parseBoardRouteParams } from '@/app/lib/url-utils';
import { parseBoardRouteParamsWithSlugs } from '@/app/lib/url-utils.server';
import CreateClimbForm from '@/app/components/create-climb/create-climb-form';
import { Metadata } from 'next';

/**
 * Generates a user-friendly board title for create page metadata
 */
function generateBoardTitle(boardDetails: BoardDetails): string {
  const parts: string[] = [];

  const boardName = boardDetails.board_name.charAt(0).toUpperCase() + boardDetails.board_name.slice(1);
  parts.push(boardName);

  if (boardDetails.layout_name) {
    const layoutName = boardDetails.layout_name
      .replace(new RegExp(`^${boardDetails.board_name}\\s*(board)?\\s*`, 'i'), '')
      .trim();
    if (layoutName) {
      parts.push(layoutName);
    }
  }

  if (boardDetails.size_name) {
    const sizeMatch = boardDetails.size_name.match(/(\d+)\s*x\s*(\d+)/i);
    if (sizeMatch) {
      parts.push(`${sizeMatch[1]}x${sizeMatch[2]}`);
    } else {
      parts.push(boardDetails.size_name);
    }
  } else if (boardDetails.size_description) {
    parts.push(boardDetails.size_description);
  }

  return parts.join(' ');
}

export async function generateMetadata(props: {
  params: Promise<BoardRouteParameters>;
}): Promise<Metadata> {
  const params = await props.params;

  try {
    const hasNumericParams = [params.layout_id, params.size_id, params.set_ids].some((param) =>
      param.includes(',') ? param.split(',').every((id) => /^\d+$/.test(id.trim())) : /^\d+$/.test(param),
    );

    let parsedParams: ParsedBoardRouteParameters;

    if (hasNumericParams) {
      parsedParams = parseBoardRouteParams(params);
    } else {
      parsedParams = await parseBoardRouteParamsWithSlugs(params);
    }

    const boardDetails = await getBoardDetails(parsedParams);
    const boardTitle = generateBoardTitle(boardDetails);
    const title = `Create Climb on ${boardTitle} | Boardsesh`;
    const description = `Create a new climb on ${boardTitle} at ${parsedParams.angle}°. Design your own routes and share them with the community.`;

    return {
      title,
      description,
      openGraph: {
        title: `Create Climb on ${boardTitle}`,
        description,
        type: 'website',
      },
      twitter: {
        card: 'summary',
        title: `Create Climb on ${boardTitle}`,
        description,
      },
    };
  } catch {
    return {
      title: 'Create Climb | Boardsesh',
      description: 'Create a new climb on your climbing board',
    };
  }
}

interface CreateClimbPageProps {
  params: Promise<BoardRouteParameters>;
  searchParams: Promise<{ forkFrames?: string; forkName?: string }>;
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

  const boardDetails = await getBoardDetails(parsedParams);

  return (
    <CreateClimbForm
      boardDetails={boardDetails}
      angle={parsedParams.angle}
      forkFrames={searchParams.forkFrames}
      forkName={searchParams.forkName}
    />
  );
}
