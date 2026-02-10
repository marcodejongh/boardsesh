'use client';

import React from 'react';
import { usePersistentSession } from '../persistent-session';
import { PersistentQueueProvider } from './persistent-queue-provider';
import { BoardProvider } from '../board-provider/board-provider-context';
import { BluetoothProvider } from '../board-bluetooth-control/bluetooth-context';
import QueueControlBar from './queue-control-bar';

/**
 * Self-contained queue control bar for use outside board routes.
 *
 * Reads queue state from the persistent session, determines whether there is
 * an active queue to display, and wraps QueueControlBar with the provider
 * stack it needs (BoardProvider → PersistentQueueProvider → BluetoothProvider).
 *
 * Returns null when there is nothing to show, so callers can render it
 * unconditionally and only worry about positioning / layout.
 */
export default function PersistentQueueControlBar() {
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
  const hasActiveQueue =
    (localQueue.length > 0 || !!localCurrentClimbQueueItem || !!activeSession) && !!boardDetails;

  if (!hasActiveQueue || !boardDetails) {
    return null;
  }

  return (
    <BoardProvider boardName={boardDetails.board_name}>
      <PersistentQueueProvider boardDetails={boardDetails} angle={angle}>
        <BluetoothProvider boardDetails={boardDetails}>
          <QueueControlBar boardDetails={boardDetails} angle={angle} />
        </BluetoothProvider>
      </PersistentQueueProvider>
    </BoardProvider>
  );
}
