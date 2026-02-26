'use client';

import React, { useMemo } from 'react';
import { PartyProfileProvider } from '../party-manager/party-profile-context';
import { PersistentSessionProvider } from '../persistent-session';
import { QueueBridgeProvider, useQueueBridgeBoardInfo } from '../queue-control/queue-bridge-context';
import { useQueueContext } from '../graphql-queue';
import QueueControlBar from '../queue-control/queue-control-bar';
import BottomTabBar from '../bottom-tab-bar/bottom-tab-bar';
import { BoardProvider } from '../board-provider/board-provider-context';
import { ConnectionSettingsProvider } from '../connection-manager/connection-settings-context';
import { BluetoothProvider } from '../board-bluetooth-control/bluetooth-context';
import { FavoritesProvider } from '../climb-actions/favorites-batch-context';
import { PlaylistsProvider } from '../climb-actions/playlists-batch-context';
import { useClimbActionsData } from '@/app/hooks/use-climb-actions-data';
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
 * 3. QueueBridgeProvider - bridges queue context from board routes to the persistent bottom bar
 * 4. RootBottomBar - always-rendered queue control bar + bottom tab bar
 */
export default function PersistentSessionWrapper({ children, boardConfigs }: PersistentSessionWrapperProps) {
  return (
    <PartyProfileProvider>
      <PersistentSessionProvider>
        <QueueBridgeProvider>
          {children}
          <RootBottomBar boardConfigs={boardConfigs} />
        </QueueBridgeProvider>
      </PersistentSessionProvider>
    </PartyProfileProvider>
  );
}

/**
 * Persistent bottom bar rendered at the root level.
 * Always renders — the QueueBridge provides queue context from whichever provider is active.
 * QueueControlBar is only shown when there is an active queue (board details available).
 */
function RootBottomBar({ boardConfigs }: { boardConfigs: BoardConfigData }) {
  const { boardDetails, angle, hasActiveQueue } = useQueueBridgeBoardInfo();

  return (
    <div className={bottomBarStyles.bottomBarWrapper} data-testid="bottom-bar-wrapper">
      {hasActiveQueue && boardDetails && (
        <ErrorBoundary>
          <BoardProvider boardName={boardDetails.board_name}>
            <ConnectionSettingsProvider>
              <BluetoothProvider boardDetails={boardDetails}>
                <RootQueueControlBarWithProviders boardDetails={boardDetails} angle={angle} />
              </BluetoothProvider>
            </ConnectionSettingsProvider>
          </BoardProvider>
        </ErrorBoundary>
      )}
      <BottomTabBar boardDetails={boardDetails} angle={angle} boardConfigs={boardConfigs} />
    </div>
  );
}

/**
 * Wraps QueueControlBar with FavoritesProvider and PlaylistsProvider.
 * Must be rendered inside QueueContext.Provider (via QueueBridge) so useQueueContext works.
 * React Query deduplicates API calls with the board route's providers.
 */
function RootQueueControlBarWithProviders({
  boardDetails,
  angle,
}: {
  boardDetails: NonNullable<ReturnType<typeof useQueueBridgeBoardInfo>['boardDetails']>;
  angle: number;
}) {
  const { queue, currentClimb } = useQueueContext();

  const climbUuids = useMemo(() => {
    const queueUuids = queue.map((item) => item.climb?.uuid).filter(Boolean) as string[];
    if (currentClimb?.uuid) {
      queueUuids.push(currentClimb.uuid);
    }
    return Array.from(new Set(queueUuids)).sort();
  }, [queue, currentClimb]);

  const { favoritesProviderProps, playlistsProviderProps } = useClimbActionsData({
    boardName: boardDetails.board_name,
    layoutId: boardDetails.layout_id,
    angle,
    climbUuids,
  });

  return (
    <FavoritesProvider {...favoritesProviderProps}>
      <PlaylistsProvider {...playlistsProviderProps}>
        <QueueControlBar boardDetails={boardDetails} angle={angle} />
      </PlaylistsProvider>
    </FavoritesProvider>
  );
}
