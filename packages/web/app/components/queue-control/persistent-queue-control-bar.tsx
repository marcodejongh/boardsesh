'use client';

import React, { useMemo } from 'react';
import { usePersistentSession } from '../persistent-session';
import { GraphQLQueueProvider } from '../graphql-queue';
import { ConnectionSettingsProvider } from '../connection-manager/connection-settings-context';
import { BoardProvider } from '../board-provider/board-provider-context';
import { BluetoothProvider } from '../board-bluetooth-control/bluetooth-context';
import QueueControlBar from './queue-control-bar';
import { getBaseBoardPath } from '@/app/lib/url-utils';
import type { ParsedBoardRouteParameters } from '@/app/lib/types';

/**
 * Self-contained queue control bar for use outside board routes.
 *
 * Reads queue state from the persistent session, determines whether there is
 * an active queue to display, and wraps QueueControlBar with the full
 * GraphQLQueueProvider (supporting search, suggestions, playlists, favourites,
 * and party mode) so the queue behaves identically everywhere.
 *
 * Returns null when there is nothing to show, so callers can render it
 * unconditionally and only worry about positioning / layout.
 */
interface PersistentQueueControlBarProps {
  className?: string;
}

export default function PersistentQueueControlBar({ className }: PersistentQueueControlBarProps) {
  const {
    activeSession,
    localQueue,
    localCurrentClimbQueueItem,
    localBoardDetails,
    localBoardPath,
  } = usePersistentSession();

  const isPartyMode = !!activeSession;
  const boardDetails = isPartyMode ? activeSession.boardDetails : localBoardDetails;
  const angle = isPartyMode
    ? activeSession.parsedParams.angle
    : (localCurrentClimbQueueItem?.climb?.angle ?? 0);
  const hasActiveQueue =
    (localQueue.length > 0 || !!localCurrentClimbQueueItem || !!activeSession) && !!boardDetails;

  // Build parsedParams from boardDetails + angle (same fields the board route extracts from the URL)
  const parsedParams: ParsedBoardRouteParameters | null = useMemo(() => {
    if (!boardDetails) return null;
    return {
      board_name: boardDetails.board_name,
      layout_id: boardDetails.layout_id,
      size_id: boardDetails.size_id,
      set_ids: boardDetails.set_ids,
      angle,
    };
  }, [boardDetails, angle]);

  // Compute the base board path that GraphQLQueueProvider uses to identify the queue.
  // In party mode use the session's board path; in local mode use the stored board path.
  const baseBoardPath = useMemo(() => {
    if (isPartyMode && activeSession.boardPath) {
      return getBaseBoardPath(activeSession.boardPath);
    }
    return localBoardPath ?? '';
  }, [isPartyMode, activeSession?.boardPath, localBoardPath]);

  if (!hasActiveQueue || !boardDetails || !parsedParams) {
    return null;
  }

  const content = (
    <BoardProvider boardName={boardDetails.board_name}>
      <ConnectionSettingsProvider>
        <GraphQLQueueProvider
          parsedParams={parsedParams}
          boardDetails={boardDetails}
          baseBoardPath={baseBoardPath}
        >
          <BluetoothProvider boardDetails={boardDetails}>
            <QueueControlBar boardDetails={boardDetails} angle={angle} />
          </BluetoothProvider>
        </GraphQLQueueProvider>
      </ConnectionSettingsProvider>
    </BoardProvider>
  );

  if (className) {
    return <div className={className}>{content}</div>;
  }

  return content;
}
