'use client';

import React from 'react';
import { PartyProfileProvider } from '../party-manager/party-profile-context';
import { PersistentSessionProvider } from '../persistent-session';
import PersistentQueueControlBar from '../queue-control/persistent-queue-control-bar';
import BottomTabBar from '../bottom-tab-bar/bottom-tab-bar';
import { BoardRouteBottomBarProvider, useBoardRouteBottomBar } from '../bottom-tab-bar/board-route-bottom-bar-context';
import ErrorBoundary from '../error-boundary';
import bottomBarStyles from '../bottom-tab-bar/bottom-bar-wrapper.module.css';
import { BoardConfigData } from '@/app/lib/server-board-configs';

interface PersistentSessionWrapperProps {
  children: React.ReactNode;
  boardConfigs: BoardConfigData;
}

/**
 * Root-level wrapper that provides:
 * 1. PartyProfileProvider - user profile from IndexedDB and NextAuth session
 * 2. PersistentSessionProvider - WebSocket connection management that persists across navigation
 * 3. BoardRouteBottomBarProvider - tracks whether a board route has its own bottom bar
 * 4. RootBottomBar - persistent queue control bar + bottom tab bar on all non-board pages
 */
export default function PersistentSessionWrapper({ children, boardConfigs }: PersistentSessionWrapperProps) {
  return (
    <PartyProfileProvider>
      <PersistentSessionProvider>
        <BoardRouteBottomBarProvider>
          {children}
          <RootBottomBar boardConfigs={boardConfigs} />
        </BoardRouteBottomBarProvider>
      </PersistentSessionProvider>
    </PartyProfileProvider>
  );
}

/**
 * Persistent bottom bar rendered at the root level.
 * Hides itself when a board route registers its own bottom bar.
 */
function RootBottomBar({ boardConfigs }: { boardConfigs: BoardConfigData }) {
  const { hasBoardRouteBottomBar } = useBoardRouteBottomBar();

  if (hasBoardRouteBottomBar) {
    return null;
  }

  return (
    <div className={bottomBarStyles.bottomBarWrapper}>
      <ErrorBoundary>
        <PersistentQueueControlBar />
      </ErrorBoundary>
      <BottomTabBar boardConfigs={boardConfigs} />
    </div>
  );
}
