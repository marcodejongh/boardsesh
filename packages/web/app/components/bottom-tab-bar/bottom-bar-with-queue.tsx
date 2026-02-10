'use client';

import React from 'react';
import { usePersistentSession } from '@/app/components/persistent-session';
import { PersistentQueueProvider } from '@/app/components/queue-control/persistent-queue-provider';
import { BoardProvider } from '@/app/components/board-provider/board-provider-context';
import { BluetoothProvider } from '@/app/components/board-bluetooth-control/bluetooth-context';
import QueueControlBar from '@/app/components/queue-control/queue-control-bar';
import BottomTabBar from './bottom-tab-bar';
import ErrorBoundary from '@/app/components/error-boundary';
import bottomBarStyles from './bottom-bar-wrapper.module.css';
import { BoardConfigData } from '@/app/lib/server-board-configs';

interface BottomBarWithQueueProps {
  boardConfigs: BoardConfigData;
}

/**
 * Combined bottom bar that renders QueueControlBar (when there's an active queue)
 * stacked above the BottomTabBar. Used on non-board pages (my-library, notifications)
 * that need both components in a single fixed container.
 */
export default function BottomBarWithQueue({ boardConfigs }: BottomBarWithQueueProps) {
  const {
    activeSession,
    localQueue,
    localCurrentClimbQueueItem,
    localBoardDetails,
  } = usePersistentSession();

  const isPartyMode = !!activeSession;
  const queueBoardDetails = isPartyMode ? activeSession.boardDetails : localBoardDetails;
  const queueAngle = isPartyMode
    ? activeSession.parsedParams.angle
    : (localCurrentClimbQueueItem?.climb?.angle ?? 0);
  const hasActiveQueue = (localQueue.length > 0 || !!localCurrentClimbQueueItem || !!activeSession) && !!queueBoardDetails;

  return (
    <div className={bottomBarStyles.bottomBarWrapper}>
      {hasActiveQueue && queueBoardDetails && (
        <ErrorBoundary>
          <BoardProvider boardName={queueBoardDetails.board_name}>
            <PersistentQueueProvider boardDetails={queueBoardDetails} angle={queueAngle}>
              <BluetoothProvider boardDetails={queueBoardDetails}>
                <QueueControlBar boardDetails={queueBoardDetails} angle={queueAngle} />
              </BluetoothProvider>
            </PersistentQueueProvider>
          </BoardProvider>
        </ErrorBoundary>
      )}
      <BottomTabBar boardConfigs={boardConfigs} />
    </div>
  );
}
