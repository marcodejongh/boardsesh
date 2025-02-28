import React from 'react';
import SizeSelection from '@/app/components/setup-wizard/size-selection';
import { fetchSizes } from '@/app/components/rest-api/api';
import { BoardName, LayoutId } from '@/app/lib/types';

export default async function LayoutsPage(props: { params: Promise<{ board_name: BoardName; layout_id: LayoutId }> }) {
  const params = await props.params;
  const sizes = await fetchSizes(params.board_name, params.layout_id);
  return <SizeSelection sizes={sizes} />;
}
