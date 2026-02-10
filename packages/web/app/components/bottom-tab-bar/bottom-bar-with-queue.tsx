'use client';

import React from 'react';
import PersistentQueueControlBar from '@/app/components/queue-control/persistent-queue-control-bar';
import BottomTabBar from './bottom-tab-bar';
import ErrorBoundary from '@/app/components/error-boundary';
import bottomBarStyles from './bottom-bar-wrapper.module.css';
import { BoardConfigData } from '@/app/lib/server-board-configs';

interface BottomBarWithQueueProps {
  boardConfigs: BoardConfigData;
}

/**
 * Combined bottom bar that renders QueueControlBar (when there's an active queue)
 * stacked above the BottomTabBar. Used on non-board pages (my-library, notifications)
 * that need both components in a single fixed container.
 */
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
