'use client';

import React from 'react';
import { PartyProfileProvider } from '../party-manager/party-profile-context';
import { PersistentSessionProvider, FloatingSessionThumbnail } from '../persistent-session';
import { DraftsProvider } from '../drafts/drafts-context';

interface PersistentSessionWrapperProps {
  children: React.ReactNode;
}

/**
 * Root-level wrapper that provides:
 * 1. PartyProfileProvider - user profile from IndexedDB and NextAuth session
 * 2. PersistentSessionProvider - WebSocket connection management that persists across navigation
 * 3. FloatingSessionThumbnail - shows current session when navigated away from board
 * 4. DraftsProvider - draft climb persistence using IndexedDB
 */
export default function PersistentSessionWrapper({ children }: PersistentSessionWrapperProps) {
  return (
    <PartyProfileProvider>
      <DraftsProvider>
        <PersistentSessionProvider>
          <FloatingSessionThumbnail />
          {children}
        </PersistentSessionProvider>
      </DraftsProvider>
    </PartyProfileProvider>
  );
}
