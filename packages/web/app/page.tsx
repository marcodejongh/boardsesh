import React from 'react';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth/next';
import ConsolidatedBoardConfig from './components/setup-wizard/consolidated-board-config';
import { getAllBoardConfigs } from './lib/server-board-configs';
import { DEFAULT_BOARD_COOKIE_NAME } from './lib/default-board-cookie';
import { authOptions } from './lib/auth/auth-options';
import HomePageContent from './home-page-content';

type HomeProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;

  // Check if user explicitly wants to see the board selector
  const showSelector = params.select === 'true';

  if (showSelector) {
    const boardConfigs = await getAllBoardConfigs();
    return <ConsolidatedBoardConfig boardConfigs={boardConfigs} />;
  }

  // Check for authenticated user with a default board
  const session = await getServerSession(authOptions);
  const cookieStore = await cookies();
  const defaultBoardCookie = cookieStore.get(DEFAULT_BOARD_COOKIE_NAME);

  // Authenticated users with a default board see the Home feed
  if (session?.user && defaultBoardCookie?.value) {
    return <HomePageContent />;
  }

  // Unauthenticated users without a default board see the board selector
  // If they have a default board but aren't authenticated, redirect to it
  if (!session?.user && defaultBoardCookie?.value) {
    const { redirect } = await import('next/navigation');
    const defaultBoardUrl = decodeURIComponent(defaultBoardCookie.value);
    redirect(defaultBoardUrl);
  }

  const boardConfigs = await getAllBoardConfigs();
  return <ConsolidatedBoardConfig boardConfigs={boardConfigs} />;
}
