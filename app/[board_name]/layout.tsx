'use client';
import React, { use } from 'react';
import { PropsWithChildren } from 'react';
import { ParsedBoardRouteParameters, BoardRouteParametersWithUuid } from '@/app/lib/types';
import { parseBoardRouteParams } from '@/app/lib/url-utils'; // Assume this utility helps with parsing

import { BoardProvider } from '../components/board-provider/board-provider-context';

interface BoardLayoutProps {
  params: Promise<BoardRouteParametersWithUuid>;
}

export default async function BoardLayout(props: PropsWithChildren<BoardLayoutProps>) {
  const params = await props.params;

  const {
    children
  } = props;

  // Parse the route parameters
  const parsedParams: ParsedBoardRouteParameters = parseBoardRouteParams(params);

  const { board_name } = parsedParams;
  return <BoardProvider boardName={board_name}>{children}</BoardProvider>;
}
