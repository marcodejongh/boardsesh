import React from 'react';
import { fetchSets } from '@/app/components/rest-api/api';
import SetsSelection from '@/app/components/setup-wizard/sets-and-angle-selection';
import { BoardName, BoardRouteParameters, LayoutId, Size } from '@/app/lib/types';
import { parseBoardRouteParams } from '@/app/lib/url-utils';

export default async function LayoutsPage({
  params,
  children,
}: {
  params: BoardRouteParameters;
  children: React.ReactNode;
}) {
  const parsedBoardRouteParameters = parseBoardRouteParams(params);
  const sets = await fetchSets(parsedBoardRouteParameters.board_name, parsedBoardRouteParameters.layout_id, parsedBoardRouteParameters.size_id);
  
  return <>
    <SetsSelection sets={sets} parsedBoardRouteParameters={parsedBoardRouteParameters} />
    {children}
  </>;
}
