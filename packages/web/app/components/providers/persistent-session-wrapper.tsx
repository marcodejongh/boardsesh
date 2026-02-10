'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { PartyProfileProvider } from '../party-manager/party-profile-context';
import { PersistentSessionProvider, useIsOnBoardRoute } from '../persistent-session';
import PersistentQueueControlBar from '../queue-control/persistent-queue-control-bar';

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
 * Shows the QueueControlBar when the user is NOT on a board route and NOT on
 * a page that renders its own bottom bar (home, my-library, notifications).
 * The PersistentQueueControlBar handles queue-state checks and provider wrapping internally.
 */
function OffBoardQueueBar() {
  const isOnBoardRoute = useIsOnBoardRoute();
  const pathname = usePathname();
  const isHomePage = pathname === '/';
  // Pages with their own layout that includes BottomBarWithQueue handle the queue bar themselves
  const hasOwnBottomBar = pathname.startsWith('/my-library') || pathname.startsWith('/notifications');

  if (isOnBoardRoute || isHomePage || hasOwnBottomBar) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        width: '100%',
        zIndex: 999,
      }}
    >
      <PersistentQueueControlBar />
    </div>
  );
}
