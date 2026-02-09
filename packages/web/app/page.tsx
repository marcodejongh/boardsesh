import React from 'react';
import ConsolidatedBoardConfig from './components/setup-wizard/consolidated-board-config';
import { getAllBoardConfigs } from './lib/server-board-configs';
import HomePageContent from './home-page-content';

type HomeProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const boardConfigs = await getAllBoardConfigs();

  // Check if user explicitly wants to see the board selector
  if (params.select === 'true') {
    return <ConsolidatedBoardConfig boardConfigs={boardConfigs} />;
  }

  // Home page for all users (auth state handled client-side)
  return <HomePageContent boardConfigs={boardConfigs} />;
}
