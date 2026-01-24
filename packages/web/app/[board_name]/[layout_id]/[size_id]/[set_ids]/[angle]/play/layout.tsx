import React from 'react';
import { PropsWithChildren } from 'react';

import { BoardRouteParameters, ParsedBoardRouteParameters, BoardDetails } from '@/app/lib/types';
import { parseBoardRouteParams } from '@/app/lib/url-utils';
import { parseBoardRouteParamsWithSlugs } from '@/app/lib/url-utils.server';
import { getBoardDetails } from '@/app/lib/__generated__/product-sizes-data';
import { getMoonBoardDetails } from '@/app/lib/moonboard-config';
import PlayLayoutClient from './layout-client';

interface LayoutProps {
  params: Promise<BoardRouteParameters>;
}

export default async function PlayLayout(props: PropsWithChildren<LayoutProps>) {
  const params = await props.params;
  const { children } = props;

  // Check if any parameters are in numeric format (old URLs)
  const hasNumericParams = [params.layout_id, params.size_id, params.set_ids].some((param) =>
    param.includes(',') ? param.split(',').every((id) => /^\d+$/.test(id.trim())) : /^\d+$/.test(param),
  );

  let parsedParams: ParsedBoardRouteParameters;

  if (hasNumericParams) {
    parsedParams = parseBoardRouteParams(params);
  } else {
    parsedParams = await parseBoardRouteParamsWithSlugs(params);
  }

  // Use MoonBoard-specific details function for moonboard
  let boardDetails: BoardDetails;
  if (parsedParams.board_name === 'moonboard') {
    boardDetails = getMoonBoardDetails(parsedParams);
  } else {
    boardDetails = getBoardDetails(parsedParams);
  }

  return <PlayLayoutClient boardDetails={boardDetails}>{children}</PlayLayoutClient>;
}
