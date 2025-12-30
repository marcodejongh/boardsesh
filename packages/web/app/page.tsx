import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import ConsolidatedBoardConfig from './components/setup-wizard/consolidated-board-config';
import { getAllBoardConfigs } from './lib/server-board-configs';
import { DEFAULT_BOARD_COOKIE_NAME } from './lib/default-board-cookie';

type HomeProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;

  // Check if user explicitly wants to see the board selector
  // This allows bypassing the redirect by clicking the logo or using ?select=true
  const showSelector = params.select === 'true';

  if (!showSelector) {
    // Check for default board cookie and redirect if present
    const cookieStore = await cookies();
    const defaultBoardCookie = cookieStore.get(DEFAULT_BOARD_COOKIE_NAME);

    if (defaultBoardCookie?.value) {
      const defaultBoardUrl = decodeURIComponent(defaultBoardCookie.value);
      redirect(defaultBoardUrl);
    }
  }

  const boardConfigs = await getAllBoardConfigs();

  return <ConsolidatedBoardConfig boardConfigs={boardConfigs} />;
}
