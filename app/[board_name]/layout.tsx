'use client';
import React from 'react';
import { PropsWithChildren } from 'react';
import { ParsedBoardRouteParameters, BoardRouteParametersWithUuid } from '@/app/lib/types';
import { parseBoardRouteParams } from '@/app/lib/url-utils'; // Assume this utility helps with parsing

import { BoardProvider } from '../components/board-provider/board-provider-context';

interface BoardLayoutProps {
  params: BoardRouteParametersWithUuid;
}

export default async function BoardLayout({ children, params }: PropsWithChildren<BoardLayoutProps>) {
  // Parse the route parameters
  const parsedParams: ParsedBoardRouteParameters = await parseBoardRouteParams(params);

  const { board_name } = parsedParams;
  return <BoardProvider boardName={board_name}>{children}</BoardProvider>;
}
