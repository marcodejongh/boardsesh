import React from 'react';
import BottomTabBar from '@/app/components/bottom-tab-bar/bottom-tab-bar';
import { getAllBoardConfigs } from '@/app/lib/server-board-configs';
import bottomBarStyles from '@/app/components/bottom-tab-bar/bottom-bar-wrapper.module.css';

export default async function NotificationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const boardConfigs = await getAllBoardConfigs();

  return (
    <div style={{ minHeight: '100dvh', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {children}
      <div className={bottomBarStyles.bottomBarWrapper}>
        <BottomTabBar boardConfigs={boardConfigs} />
      </div>
    </div>
  );
}
