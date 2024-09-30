import React from 'react';
import { fetchSets } from '@/app/components/rest-api/api';
import SetsSelection from '@/app/components/setup-wizard/sets-selection';
import { BoardName, LayoutId, Size } from '@/app/lib/types';

export default async function LayoutsPage({ params }: { params: { board_name: BoardName, layout_id: LayoutId, size_id: Size}}) {
  const sets = await fetchSets(params.board_name, params.layout_id, params.size_id);
  return (<SetsSelection sets={sets}/>)
}
