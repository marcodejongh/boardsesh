'use client';

import React from 'react';
import BottomTabBar from './bottom-tab-bar';
import bottomBarStyles from './bottom-bar-wrapper.module.css';
import { BoardConfigData } from '@/app/lib/server-board-configs';

interface BottomBarWithQueueProps {
  boardConfigs: BoardConfigData;
}

/**
 * Bottom bar wrapper that renders the BottomTabBar in a fixed container.
 * The queue control bar is now rendered once at the root level by
 * PersistentSessionWrapper, so this component only handles the tab bar.
 */
export default function BottomBarWithQueue({ boardConfigs }: BottomBarWithQueueProps) {
  return (
    <div className={bottomBarStyles.bottomBarWrapper}>
      <BottomTabBar boardConfigs={boardConfigs} />
    </div>
  );
}
