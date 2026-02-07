'use client';

import React from 'react';
import { PartyProfileProvider } from '../party-manager/party-profile-context';
import { PersistentSessionProvider, usePersistentSession, useIsOnBoardRoute } from '../persistent-session';
import { PersistentQueueProvider } from '../queue-control/persistent-queue-provider';
import { BoardProvider } from '../board-provider/board-provider-context';
import QueueControlBar from '../queue-control/queue-control-bar';

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
 * Renders the same QueueControlBar used on board pages, but wrapped in a
 * PersistentQueueProvider bridge so it works off board routes (settings, profile, etc.).
 * Only visible when there is an active queue or party session and the user is NOT on a board route.
 */
function OffBoardQueueBar() {
  const isOnBoardRoute = useIsOnBoardRoute();
  const {
    activeSession,
    localQueue,
    localCurrentClimbQueueItem,
    localBoardDetails,
  } = usePersistentSession();

  const isPartyMode = !!activeSession;
  const boardDetails = isPartyMode ? activeSession.boardDetails : localBoardDetails;
  const angle = isPartyMode
    ? activeSession.parsedParams.angle
    : (localCurrentClimbQueueItem?.climb?.angle ?? 0);

  // Only show when off board routes and there's something to show
  const hasContent = localQueue.length > 0 || !!localCurrentClimbQueueItem || !!activeSession;
  if (!hasContent || isOnBoardRoute || !boardDetails) {
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
      <BoardProvider boardName={boardDetails.board_name}>
        <PersistentQueueProvider boardDetails={boardDetails} angle={angle}>
          <QueueControlBar boardDetails={boardDetails} angle={angle} />
        </PersistentQueueProvider>
      </BoardProvider>
    </div>
  );
}
