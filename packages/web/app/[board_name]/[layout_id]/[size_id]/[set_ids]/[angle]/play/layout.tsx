import React from 'react';
import { PropsWithChildren } from 'react';

import { BoardRouteParameters } from '@/app/lib/types';
import { parseRouteParams } from '@/app/lib/url-utils.server';
import { getBoardDetailsForBoard } from '@/app/lib/board-utils';
import PlayLayoutClient from './layout-client';

interface LayoutProps {
  params: Promise<BoardRouteParameters>;
}

export default async function PlayLayout(props: PropsWithChildren<LayoutProps>) {
  const params = await props.params;
  const { children } = props;

  const { parsedParams } = await parseRouteParams(params);
  const boardDetails = getBoardDetailsForBoard(parsedParams);

  return <PlayLayoutClient boardDetails={boardDetails}>{children}</PlayLayoutClient>;
}
