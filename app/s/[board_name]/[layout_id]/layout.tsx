import React from 'react';
import SizeSelection from '@/app/components/setup-wizard/size-selection';
import { fetchSizes } from '@/app/components/rest-api/api';
import { BoardRouteParameters } from '@/app/lib/types';
import { parseBoardRouteParams } from '@/app/lib/url-utils';

export default async function LayoutsPage({ params, children }: { params: BoardRouteParameters, children: React.ReactNode }) {
  const parsedBoardRouteParameters = parseBoardRouteParams(params);
  const sizes = await fetchSizes(parsedBoardRouteParameters.board_name, parsedBoardRouteParameters.layout_id);
  return <>
    <SizeSelection sizes={sizes} boardRouteParameters={parsedBoardRouteParameters} />
    {children}
  </>;
}
