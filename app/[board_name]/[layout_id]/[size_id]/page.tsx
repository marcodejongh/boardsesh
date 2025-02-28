import React from 'react';
import { fetchSets } from '@/app/components/rest-api/api';
import SetsSelection from '@/app/components/setup-wizard/sets-selection';
import { BoardName, LayoutId, Size } from '@/app/lib/types';

export default async function LayoutsPage(
  props: {
    params: Promise<{ board_name: BoardName; layout_id: LayoutId; size_id: Size }>;
  }
) {
  const params = await props.params;
  const sets = await fetchSets(params.board_name, params.layout_id, params.size_id);
  return <SetsSelection sets={sets} />;
}
