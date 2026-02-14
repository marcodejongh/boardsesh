'use client';

import React from 'react';
import BottomTabBar from './bottom-tab-bar';
import PersistentQueueControlBar from '@/app/components/queue-control/persistent-queue-control-bar';
import ErrorBoundary from '@/app/components/error-boundary';
import bottomBarStyles from './bottom-bar-wrapper.module.css';
import { BoardConfigData } from '@/app/lib/server-board-configs';

interface BottomBarWithQueueProps {
  boardConfigs: BoardConfigData;
}

export default function BottomBarWithQueue({ boardConfigs }: BottomBarWithQueueProps) {
  return (
    <div className={bottomBarStyles.bottomBarWrapper}>
      <ErrorBoundary>
        <PersistentQueueControlBar />
      </ErrorBoundary>
      <BottomTabBar boardConfigs={boardConfigs} />
    </div>
  );
}
