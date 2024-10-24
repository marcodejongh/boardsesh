// app/page.tsx
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React from 'react';
import LayoutSelection from '@/c/setup-wizard/layout-selection';
import { fetchLayouts } from '@/c/rest-api/api';
import { BoardName } from '@/lib/types';

export default async function LayoutsPage({ params, children }: { params: { board_name: BoardName }, children: React.ReactNode }) {
  const layouts = await fetchLayouts(params.board_name);
  return <><div style={{ padding: '24px', background: '#f7f7f7', borderRadius: '8px' }}>
    </div>
    <LayoutSelection layouts={layouts} boardName={params.board_name} />
    {children}
  </>;
}
