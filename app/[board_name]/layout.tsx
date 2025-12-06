import React from 'react';
import { PropsWithChildren } from 'react';
import { BoardName, BoardOnlyRouteParameters } from '@/app/lib/types';

import { BoardProvider } from '../components/board-provider/board-provider-context';

interface BoardLayoutProps {
  params: Promise<BoardOnlyRouteParameters>;
}

export default async function BoardLayout(props: PropsWithChildren<BoardLayoutProps>) {
  const params = await props.params;

  const { children } = props;

  const board_name = params.board_name as BoardName;
  return <BoardProvider boardName={board_name}>{children}</BoardProvider>;
}
