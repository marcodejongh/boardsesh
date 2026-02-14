'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { PartyProfileProvider } from '../party-manager/party-profile-context';
import { PersistentSessionProvider, useIsOnBoardRoute } from '../persistent-session';
import PersistentQueueControlBar from '../queue-control/persistent-queue-control-bar';
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
 * Fallback queue bar for pages that don't render their own inline queue bar.
 * Board routes render their own provider. Home, my-library, and notifications
 * each render an inline PersistentQueueControlBar inside their bottom bar wrapper,
 * so this component returns null on those pages to avoid double-rendering.
 */
function OffBoardQueueBar() {
  const isOnBoardRoute = useIsOnBoardRoute();
  const pathname = usePathname();
  const isHomePage = pathname === '/';
  const hasOwnBottomBar = pathname.startsWith('/my-library') || pathname.startsWith('/notifications');

  if (isOnBoardRoute || isHomePage || hasOwnBottomBar) {
    return null;
  }

  return <PersistentQueueControlBar className={styles.fixedBottom} />;
}
