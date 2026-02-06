'use client';

import React from 'react';
import { PartyProfileProvider } from '../party-manager/party-profile-context';
import { PersistentSessionProvider } from '../persistent-session';
import GlobalQueueControlBar from '../queue-control/global-queue-control-bar';

interface PersistentSessionWrapperProps {
  children: React.ReactNode;
}

/**
 * Root-level wrapper that provides:
 * 1. PartyProfileProvider - user profile from IndexedDB and NextAuth session
 * 2. PersistentSessionProvider - WebSocket connection management that persists across navigation
 * 3. GlobalQueueControlBar - compact bar shown when navigated away from board routes
 */
export default function PersistentSessionWrapper({ children }: PersistentSessionWrapperProps) {
  return (
    <PartyProfileProvider>
      <PersistentSessionProvider>
        {children}
        <GlobalQueueControlBar />
      </PersistentSessionProvider>
    </PartyProfileProvider>
  );
}
