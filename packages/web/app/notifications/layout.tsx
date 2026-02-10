import React from 'react';
import BottomBarWithQueue from '@/app/components/bottom-tab-bar/bottom-bar-with-queue';
import { getAllBoardConfigs } from '@/app/lib/server-board-configs';

export default async function NotificationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const boardConfigs = await getAllBoardConfigs();

  return (
    <div style={{ minHeight: '100dvh', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {children}
      <BottomBarWithQueue boardConfigs={boardConfigs} />
    </div>
  );
}
