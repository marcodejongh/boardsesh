import React from 'react';
import ConsolidatedBoardConfig from './components/setup-wizard/consolidated-board-config';
import { getAllBoardConfigs } from './lib/server-board-configs';

export default async function Home() {
  const boardConfigs = await getAllBoardConfigs();

  return <ConsolidatedBoardConfig boardConfigs={boardConfigs} />;
}
