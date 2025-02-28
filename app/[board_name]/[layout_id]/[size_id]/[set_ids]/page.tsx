import AngleSelection from '@/app/components/setup-wizard/angle-selection';
import { BoardName } from '@/app/lib/types';
import React from 'react';

export default async function LayoutsPage(props: { params: Promise<{ board_name: BoardName }> }) {
  const params = await props.params;

  const {
    board_name
  } = params;

  return <AngleSelection board_name={board_name} />;
}
