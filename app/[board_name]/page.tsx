// app/page.tsx
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React from 'react';
import LayoutSelection from '../components/setup-wizard/layout-selection';
import { fetchLayouts } from '../components/rest-api/api';
import { BoardName } from '../lib/types';

export default async function LayoutsPage(props: { params: Promise<{ board_name: BoardName }> }) {
  const params = await props.params;

  const {
    board_name
  } = params;

  const layouts = await fetchLayouts(board_name);
  return <LayoutSelection layouts={layouts} boardName={board_name} />;
}
