import React from 'react';
import { PropsWithChildren } from 'react';
import { notFound } from 'next/navigation';

import { BoardRouteParameters, ParsedBoardRouteParameters } from '@/app/lib/types';
import { parseBoardRouteParams } from '@/app/lib/url-utils';
import { parseBoardRouteParamsWithSlugs } from '@/app/lib/url-utils.server';
import { getBoardDetails } from '@/app/lib/__generated__/product-sizes-data';
import PlayLayoutClient from './layout-client';

interface LayoutProps {
  params: Promise<BoardRouteParameters>;
}

export default async function PlayLayout(props: PropsWithChildren<LayoutProps>) {
  try {
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

    const boardDetails = await getBoardDetails(parsedParams);

    return <PlayLayoutClient boardDetails={boardDetails}>{children}</PlayLayoutClient>;
  } catch (error) {
    console.error('Error in play layout:', error);
    notFound();
  }
}
