'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { PartyProfileProvider } from '../party-manager/party-profile-context';
import { PersistentSessionProvider, useIsOnBoardRoute } from '../persistent-session';
import PersistentQueueControlBar from '../queue-control/persistent-queue-control-bar';
import ErrorBoundary from '../error-boundary';
import styles from '../queue-control/persistent-queue-control-bar.module.css';

interface PersistentSessionWrapperProps {
  children: React.ReactNode;
}

/**
 * Root-level wrapper that provides:
 * 1. PartyProfileProvider - user profile from IndexedDB and NextAuth session
 * 2. PersistentSessionProvider - WebSocket connection management that persists across navigation
 * 3. OffBoardQueueBar - shows the full QueueControlBar when navigated away from board routes
 */
export default function PersistentSessionWrapper({ children }: PersistentSessionWrapperProps) {
  return (
    <PartyProfileProvider>
      <PersistentSessionProvider>
        {children}
        <OffBoardQueueBar />
      </PersistentSessionProvider>
    </PartyProfileProvider>
  );
}

/**
 * Single root-level instance of the queue control bar for ALL non-board pages.
 * Board routes render their own provider, so this returns null on board routes.
 * On pages with a bottom tab bar (home, my-library, notifications) the queue bar
 * is positioned above the tab bar; on other pages it sits at the bottom of the viewport.
 */
function OffBoardQueueBar() {
  const isOnBoardRoute = useIsOnBoardRoute();
  const pathname = usePathname();

  if (isOnBoardRoute) {
    return null;
  }

  const hasBottomTabBar = pathname === '/' ||
    pathname.startsWith('/my-library') ||
    pathname.startsWith('/notifications');

  return (
    <ErrorBoundary>
      <PersistentQueueControlBar
        className={hasBottomTabBar ? styles.aboveTabBar : styles.fixedBottom}
      />
    </ErrorBoundary>
  );
}
