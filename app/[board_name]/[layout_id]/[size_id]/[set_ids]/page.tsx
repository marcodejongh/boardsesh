import AngleSelection from '@/app/components/setup-wizard/angle-selection';
import { BoardName } from '@/app/lib/types';
import React from 'react';

export default async function LayoutsPage({ params: { board_name } }: { params: { board_name: BoardName } }) {
  return <AngleSelection board_name={board_name} />;
}
