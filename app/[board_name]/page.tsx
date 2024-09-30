// app/page.tsx
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React from 'react';
import LayoutSelection from '../components/setup-wizard/layout-selection';
import { fetchLayouts } from '../components/rest-api/api';
import { BoardName } from '../lib/types';

export default async function LayoutsPage({ params }: { params: { board_name: BoardName } }) {
  const layouts = await fetchLayouts(params.board_name);
  return <LayoutSelection layouts={layouts} />;
}
